# Protocol: Manager ↔ Worker (gRPC + Waycast)

Package: [`@vlab/grpc`](../architecture/shared-packages.md#packagesvlabgrpc--managerworker-rpc-layer-contract). Consumers: [`apps/manager`](../architecture/manager.md#grpc-manager--worker) (server), [`apps/worker`](../architecture/worker.md#communication-with-the-manager) (client).

## Transport shape

The Manager is the **gRPC server**; each Worker daemon is a long-lived **streaming client**. There is exactly one proto service, with two RPCs:

```proto
// packages/@vlab/grpc/proto/worker.proto, package vlab.worker
service WorkerService {
  rpc ListenCommand(stream CommandPayload) returns (stream CommandRequest);
  rpc SendMetrics(MetricsRequest) returns (MetricsResponse);
}
```

- **`ListenCommand`** — a **bidirectional stream**, one per connected worker, open for the worker's entire lifetime. This is **not** simple request/response; it's a raw byte tunnel. All "real" RPC/event traffic (deploy/destroy/evaluate/health/etc.) is multiplexed inside it.
- **`SendMetrics`** — unary, used only for periodic host CPU/memory/storage telemetry (every `METRICS_INTERVAL_MS = 10_000`ms).

Proto messages:

- **`WorkerSpec`** — `cpu_cores`, `memory_mb`, `storage_mb`, `guacd_host`, `guacd_port`. Sent once, as the **first item** on the worker→manager stream, before any other traffic — this is the worker's registration/capability handshake.
- **`CommandPayload`** (oneof `worker_spec` | `payload: bytes`) — worker→manager direction; carries either the initial spec or opaque waycast-encoded command bytes.
- **`CommandRequest`** (`payload: bytes`) — manager→worker direction; always opaque waycast bytes.
- **`MetricsRequest`/`MetricsResponse`** — the unary telemetry RPC.

So the actual business RPC surface is **not** proto messages — it's a **Waycast** router tunneled as opaque bytes over the single `ListenCommand` stream, msgpack-encoded (`src/codec.ts`'s `msgpackCodec`, base64-wrapped). Generated TS bindings (`ts-proto`) live at `packages/@vlab/grpc/src/worker.ts` ("DO NOT EDIT" — regenerated via `bun run build`).

## Connection lifecycle

```mermaid
sequenceDiagram
    participant W as Worker
    participant M as Manager
    W->>M: ListenCommand() opens bidi stream
    W->>M: CommandPayload{workerSpec} (cpu/mem/storage, guacd host/port)
    M->>M: upsert worker row, mark online
    M->>M: build Waycast client over this stream
    M->>W: clab:reconcileSessions{activeSessionIds}
    W->>M: destroyed lab IDs (drift cleanup)
    Note over W,M: stream stays open; commands/events multiplexed both ways
    loop every 10s
        W->>M: SendMetrics{cpu%, mem%, storage%} (unary)
    end
    Note over W: on disconnect/crash
    M->>M: mark worker offline, reset activeLabs/activeNodes/deployingLab
```

On worker (re)connection, the manager always issues `clab:reconcileSessions` first (see [worker.md § Reconcile](../architecture/worker.md#reconcile-domainlabreconcilets-clabreconcilesessions)) so any state drift from a crash/restart on either side is corrected before new commands flow.

Reconnection on the worker side uses **full-jitter exponential backoff**: `RECONNECT_BASE_MS=1000`, factor 2, cap 30000ms (`apps/worker/src/utils/backoff.ts`, `constants.ts`).

## Waycast command catalog (`@vlab/grpc/src/commands.ts`)

### Data (fire-and-forget event) routes — worker → manager

| Route                      | Payload                        | Purpose                                                                                                                                 |
| -------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `monitor:node-health`      | `{ id, health, lab }`          | Pushed on every clab-monitor `health-update` (see [clab-monitor.md](../architecture/clab-monitor.md#health-state-machine)).             |
| `monitor:interface-update` | `{ id, interfaces, lab }`      | Pushed on every network-monitor interface change (debounced 750ms on the manager side).                                                 |
| `evaluator:checkChanged`   | `{ sessionId, id, completed }` | Pushed on every evaluator check pass/fail transition (see [evaluator.md](../architecture/evaluator.md#how-checks-reach-the-evaluator)). |

### RPC routes — manager → worker

| Route                          | Payload                                                                                      | Response                                          | Purpose                                                                                                                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clab:deployLab`               | `{ sessionId, config: LabConfigSchema }`                                                     | `DeployedNode[]` (`id`, `ip`, `health`, `nodeId`) | Deploy a Containerlab topology for a lab session. `LabConfigSchema`: `dueDate`, `labId`, `ownerId`, `nodes[]` (id/name/image/kind/env/resources/credentials/deviceId), `links[]`. |
| `clab:destroyLab`              | `{ sessionId }`                                                                              | —                                                 | Tear down a lab session's containers.                                                                                                                                             |
| `clab:reconcileSessions`       | `{ activeSessionIds }`                                                                       | `string[]`                                        | Reconcile on-disk labs against the manager's active-session list; called on every worker (re)connect.                                                                             |
| `docker:pullImage`             | `{ image }`                                                                                  | —                                                 | Pre-pull a Docker image (used by device-template testing).                                                                                                                        |
| `docker:measureContainerStats` | `{ id }`                                                                                     | `{ cpuCores, memoryMB }`                          | Measure actual resource usage of a running container (used to suggest device-template cost hints).                                                                                |
| `evaluator:start`              | `StartEvaluationPayloadSchema` (`sessionId`, `nodeMap`, `sessionChecks[]`, initial `values`) | —                                                 | Start an evaluator session for a lab session (see [evaluator.md](../architecture/evaluator.md)).                                                                                  |
| `evaluator:stop`               | `{ sessionId, immediate? }`                                                                  | —                                                 | Stop an evaluator session.                                                                                                                                                        |

## Cross-manager coordination

Because a given worker's gRPC stream terminates on exactly **one** manager replica, a different replica that needs to command that worker can't do so directly. `apps/manager/src/services/grpc/handlers/dispatch.ts`'s `dispatchWorkerAction(actionName, workerId, payload)`:

- If the target worker is connected to _this_ replica → runs the action handler locally.
- Otherwise → publishes the action over Redis pub/sub (`vlab:worker-action:<workerId>`, msgpack-encoded); whichever replica actually owns that worker's stream picks it up via a global subscriber (`handlers/index.ts`) and executes it.

This is why every "tell a worker to do X" code path in the manager goes through `dispatchWorkerAction`/the `actionHandlers` map (`handlers/actions.ts`) rather than calling a worker's Waycast client directly.

## Worker selection (manager-side scheduling)

Not part of the wire protocol itself, but directly informed by the `WorkerSpec` handshake + periodic `SendMetrics`: `apps/manager/src/services/grpc/handlers/worker.ts`'s `tryGetAvailableWorkerId` does a `SELECT ... FOR UPDATE SKIP LOCKED` on the `worker` table, filtering by `status=online` + free CPU/mem capacity + `deployingLab < cpuCores`, ordered by `activeLabs` ascending. See [manager.md § Worker selection](../architecture/manager.md#worker-selection--scheduling).
