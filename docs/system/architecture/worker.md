# Worker Daemon (`apps/worker`)

The Worker is a long-running daemon that runs on every host machine that hosts lab containers. It maintains a single persistent gRPC connection to the Manager, provisions/tears down Containerlab topologies on command, and streams health/interface/evaluation events back.

Related: [architecture/overview.md](overview.md) · [architecture/clab.md](clab.md) (Containerlab CLI wrapper) · [architecture/clab-monitor.md](clab-monitor.md) (health monitoring) · [architecture/evaluator.md](evaluator.md) · [protocols/grpc-manager-worker.md](../protocols/grpc-manager-worker.md)

## Directory structure

```
apps/worker/src/
  index.ts                     entrypoint: process-level guards + tiny "command" dispatcher (only "serve")
  server.ts                    startServer()/shutdown(): daemon bootstrap & graceful teardown
  env.ts                       typebox-validated env vars (dotenv-loaded)
  constants.ts                 label keys, heal tuning constants, reconnect backoff constants, metrics interval
  lib/
    clab.ts                    singleton @vlab/clab Containerlab instance, configured from env
    docker.ts                  singleton dockerode Docker client (default socket)
    monitor.ts                 singleton @vlab/clab-monitor instance wired to lib/docker.ts
    guacd.ts                   lazy DNS resolution of GUACD_HOST -> GUACD_IP
    system-metrics.ts          host CPU/memory/storage sampling (no deps, uses os/node:fs)
    logger.ts                  root pino logger
  domain/
    lab/
      deploy.ts                clab:deployLab business logic
      destroy.ts               clab:destroyLab (de-duplicated in-flight per session)
      reconcile.ts             clab:reconcileSessions + checkPrerequisites
      topology.ts              builds a ContainerlabTopologyDefinition from the manager's LabConfig
    evaluation/index.ts        wraps @vlab/evaluator sessions per lab session (start/stop/debounced-stop)
  services/
    grpc/
      client.ts                nice-grpc channel + WorkerServiceDefinition client + static "worker-id" metadata
      connection.ts            runConnectionLoop(): the outbound bidi-stream loop to the Manager, with reconnect backoff
      transport.ts             waycast server bound to a fake single "manager" connection, msgpack codec
      metrics.ts                setInterval loop calling sendMetrics unary RPC
      handlers/
        index.ts               registerAllHandlers(): wires clab/docker/evaluator handlers into the waycast server
        clab.ts                clab:deployLab / clab:destroyLab / clab:reconcileSessions -> domain/lab/*
        docker.ts              docker:pullImage / docker:measureContainerStats -> dockerode
        evaluator.ts           evaluator:start / evaluator:stop -> domain/evaluation
    monitor/
      index.ts                 startMonitorService()/stopMonitorService(): bridges clab-monitor events -> grpc "data" routes + heal triggers
      heal.ts                  auto-heal state machine (per-node retry/backoff/cooldown)
  utils/backoff.ts             full-jitter exponential backoff helper (shared by reconnect + heal)
```

## Entry point / daemon bootstrap

`src/index.ts` is a minimal command dispatcher. `bun run --watch src/index.ts serve` (dev) or the compiled binary (prod) runs the single registered command, `serve`, which lazy-imports and calls `startServer()`.

`src/server.ts`'s `startServer()` bootstrap sequence:

1. **`checkPrerequisites()`** (`domain/lab/reconcile.ts` → `@vlab/clab`'s `checkPrerequisites()`) — verifies the containerlab binary is runnable, checks root/SUID/`clab_admins` group membership, and ensures `CLAB_TOPOLOGIES_PATH` is read/writable. Throws (and the whole process exits fatally) if any check fails.
2. **`resolveGuacdIp()`** — resolves `GUACD_HOST` via DNS (unless `GUACD_IP` is preset), stored back into `env.GUACD_IP` for later re-use by node startup-exec scripts and the `sendMetrics`/worker-spec handshake.
3. Ensures `CLAB_TOPOLOGIES_PATH` exists and writes a static MikroTik "no reboot" RouterOS script (`mikrotik-noreboot.rsc`) into it once, up front (shared by all `mikrotik_ros` nodes via `startup-config`).
4. **`startMonitorService(server)`** — wires `@vlab/clab-monitor` events into the RPC layer and starts the Docker event stream (`monitor.start()`).
5. **`startMetricsLoop()`** — begins the periodic host-metrics `sendMetrics` unary calls.
6. **`runConnectionLoop()`** (fire-and-forget) — the persistent outbound gRPC stream to the Manager; the main "always retrying" loop for the whole daemon's life.
7. Registers `SIGINT`/`SIGTERM` → `shutdown()`, which stops the metrics loop, the connection loop, the monitor service, force-stops all evaluations (`stopAllEvaluationsImmediately`), and closes the gRPC channel before `process.exit(0)`.

Top-level `unhandledRejection`/`uncaughtException` handlers are installed in `index.ts` (uncaught exceptions are fatal and exit(1); rejections are just logged).

## Communication with the Manager

Full wire-protocol detail: [protocols/grpc-manager-worker.md](../protocols/grpc-manager-worker.md). Worker-side wiring (`apps/worker/src/services/grpc/`):

- **`client.ts`** — creates the `nice-grpc` channel to `env.MANAGER_GRPC_URL` and a `WorkerServiceDefinition` client; attaches a static `worker-id` gRPC metadata header (`env.WORKER_ID`).
- **`transport.ts`** — builds a `waycast` **server** (`appRouter.buildServer`) bound to a synthetic single connection id `"manager"`; `feedMessage()`/`setReplySink()` are the two glue functions that bridge waycast's abstract transport to the real stream.
- **`connection.ts`** (`runConnectionLoop`) — opens `workerClient.listenCommand(replyStream, { metadata })`. The **first message sent** on the reply stream is always a `CommandPayload.workerSpec` (`WorkerSpec{ cpuCores, memoryMb, storageMb, guacdHost, guacdPort }`) — the worker's registration/capability handshake, sent once per (re)connection, before any waycast traffic. All subsequent inbound frames from the manager are fed into `feedMessage()` → dispatched to `handlers/*`; all outbound waycast traffic is pushed onto an `AsyncQueue` and drained into the reply stream.
  - Reconnection uses **full-jitter exponential backoff** (`RECONNECT_BASE_MS=1000`, factor 2, cap 30000ms — see `utils/backoff.ts` and `constants.ts`).
- **`metrics.ts`** — separate `setInterval` (`METRICS_INTERVAL_MS = 10_000`) that calls the unary `sendMetrics` RPC with `{cpuUsagePercent, memoryUsagePercent, storageUsagePercent}`; failures are just logged at debug (expected while disconnected; periodic anyway, no retry queue needed).
- **RPC handler registration** (`services/grpc/handlers/index.ts`): `registerClabHandlers`, `registerEvaluatorHandlers`, `registerDockerHandlers` are all wired onto the same waycast `server` at module-load time (side effect of importing the module in `services/grpc/index.ts`).

## Domain: Lab lifecycle (`domain/lab/*`)

### Topology generation (`domain/lab/topology.ts`, `buildTopology()`)

- Input: the manager's `LabConfigSchema` (`ownerId`, `nodes[]`, `links[]`, optional `labId`/`dueDate`).
- Node names are kebab-cased (`toKebabCase(name)`) since containerlab uses the map key as node name; an `idByKebabName` map is kept to translate back to the manager's node IDs after deploy.
- Injects vLab-specific container labels (`LABELS` in `constants.ts`): `vlab.lab.session.id`, `vlab.lab.owner.id`, plus conditionally `vlab.lab.id`, `vlab.lab.due`, `vlab.device.template.id`, `vlab.lab.node.id`.
- For `kind: "linux"` nodes with credentials, injects `USERNAME`/`PASSWORD` as env vars (consumed by `@vlab/clab-monitor`'s `extractCredentials`).
- Maps `resources.cpu`/`resources.memory` (from `@vlab/shared`'s `DeviceTemplateResourcesSchema`) straight onto containerlab's per-node `cpu`/`memory` fields — this is the **resource-limiting mechanism**; containerlab passes these through to the Docker runtime's container resource limits. No additional throttling happens in the worker itself.
- Injects a `stages.configure.exec` "on-exit" startup script per kind (`buildStartupExecs()`): for `linux` nodes it deletes the default route, re-adds a route to the resolved Guacd IP via `eth0`, forces a public DNS resolver, and **disables shutdown/reboot/poweroff/halt** by replacing those binaries with a script that exits 1 (defense against students shutting down their VM).
- For `mikrotik_ros` nodes, sets `startup-config` to the shared `mikrotik-noreboot.rsc` file (written once at daemon boot) which strips the `reboot` policy from the RouterOS default user group.
- `mgmt.network` is fixed to `env.CLAB_MGMT_NETWORK` (default `clab-mgmt`) for every lab.

### Deploy (`domain/lab/deploy.ts`)

1. `buildTopology()` → `clab.deploy(sessionId, topology)` ([`@vlab/clab`](clab.md)).
2. On success, `Containerlab.deploy()` returns `containerlab inspect --details` output, JSON-parsed into `ContainerlabInspectNode[]`.
3. Each inspected node is matched to the manager-side node ID via `idByKebabName`, its management IP is stripped of the `/prefix`, and its Docker health string is normalized via `@vlab/clab-monitor`'s `formatHealth()`. Nodes without a match or without a management IP are logged and skipped.
4. Returns `DeployedNodeSchema[]` (`{id, nodeId, ip, health}`) as the RPC response. **The Docker container ID (`id`) is what the manager stores as `lab_session_node.id`** — there is no separate ID translation layer on the manager side.

### Destroy (`domain/lab/destroy.ts`)

De-duplicates concurrent destroy calls for the same `sessionId` via an in-memory `Map<sessionId, Promise>`; stops any active evaluation immediately, then `clab.destroy(sessionId)`.

### Reconcile (`domain/lab/reconcile.ts`, `clab:reconcileSessions`)

Called once when the worker (re)connects. Compares the manager's `activeSessionIds` against `clab.listDeployedIds()` (subdirectories under `CLAB_TOPOLOGIES_PATH`) and force-destroys anything on disk that the manager doesn't consider active — self-healing against manager/worker state drift after a worker restart/crash.

## Resource limits & node lifecycle

- **Resource limits** are enforced entirely by Containerlab/Docker cgroups, driven by the per-node `cpu`/`memory` fields set from the device template's cost hints (see Topology generation above). The worker does no additional throttling.
- **Host-level capacity accounting** happens on the manager side (`worker.cpuCores/cpuUsagePercent/memoryMB/memoryUsagePercent/deployingLab/activeLabs`), populated from the `WorkerSpec` handshake and the periodic `sendMetrics` RPC. See [manager.md § Worker selection](manager.md#worker-selection--scheduling).
- **Node lifecycle** (create → start → stop → destroy), end to end:
  1. **Create/Deploy**: manager RPC `clab:deployLab` → `buildTopology()` → write YAML → `containerlab deploy` → `containerlab inspect` → matched node list returned to manager.
  2. **Start** (Docker-level): the `start` Docker event fires per container → clab-monitor resolves IP/health, adds to `nodes`, emits `health-update`, kicks off the per-kind network monitor loop (which itself waits for the node to be healthy before reading interfaces). See [clab-monitor.md](clab-monitor.md).
  3. **Runtime health cycling**: `health_status:*` events flow through `starting → healthy ⇄ unhealthy`; `unhealthy` triggers the jittered auto-heal restart (`containerlab restart --node`), up to 3 attempts with cooldown/backoff. See [clab-monitor.md § Auto-heal](clab-monitor.md#auto-heal-appsworkersrcservicesmonitorhealt).
  4. **Stop/Kill**: `kill` Docker event → clab-monitor removes from `nodes`, stops the network monitor.
  5. **Die**: `die` event → health forced to `"died"` (terminal) — rejects any pending `waitForHealth` waiters.
  6. **Destroy**: either the Docker `destroy` event (health forced to `"destroyed"`) or the explicit `clab:destroyLab` RPC → stop evaluation → `containerlab destroy --keep-mgmt-net --cleanup` + removal of the lab's topology directory.
  7. **Reconciliation**: on every worker (re)connect to the manager, `clab:reconcileSessions` destroys any lab directories that the manager no longer considers active.

## Config, scripts, env vars

**`package.json`**: `dev` (`bun run --watch src/index.ts serve | pino-pretty`), `build` (`bun build src/index.ts --compile --minify --external cpu-features --outfile ../../out/worker/app`, standalone binary), `typecheck`.

Key deps: `@vlab/clab`, `@vlab/clab-monitor`, `@vlab/evaluator`, `@vlab/grpc`, `@vlab/shared` (workspace), `dockerode`, `nice-grpc`/`nice-grpc-common`, `waycast`, `@msgpack/msgpack`, `@sinclair/typebox`, `pino`, `dotenv`.

**Env vars** (`src/env.ts`, `.env.example`):

| Var                    | Default                    | Notes                                                         |
| ---------------------- | -------------------------- | ------------------------------------------------------------- |
| `NODE_ENV`             | `development`              | `development\|production\|test`                               |
| `LOG_LEVEL`            | `info`                     | pino level                                                    |
| `WORKER_ID`            | _(required)_               | sent as gRPC metadata, identifies the worker to the manager   |
| `MANAGER_GRPC_URL`     | `manager:50051`            | target of the outbound gRPC channel                           |
| `GUACD_HOST`           | `guacd`                    | DNS name resolved once at boot (unless `GUACD_IP` set)        |
| `GUACD_IP`             | `""`                       | set to skip DNS resolution                                    |
| `GUACD_PORT`           | `4822`                     |                                                               |
| `CLAB_CLI_PATH`        | `containerlab`             | path/binary name for the containerlab CLI                     |
| `CLAB_TOPOLOGIES_PATH` | `/var/lib/vlab/topologies` | must be R/W; each lab gets a subdirectory named by session ID |
| `CLAB_MGMT_NETWORK`    | `clab-mgmt`                | shared Docker mgmt network name for all labs                  |

**`src/constants.ts`** — tuning knobs (not env-configurable):

- `HEAL_COOLDOWN_MS = 60_000`, `HEAL_MAX_ATTEMPTS = 3`, `HEAL_RETRY_BASE_MS = 5_000`, `HEAL_RETRY_FACTOR = 3`, `HEAL_TRIGGER_JITTER_MS = 3_000` — auto-heal tuning (see [clab-monitor.md](clab-monitor.md)).
- `RECONNECT_BASE_MS = 1_000`, `RECONNECT_FACTOR = 2`, `RECONNECT_CAP_MS = 30_000` — gRPC reconnect backoff.
- `METRICS_INTERVAL_MS = 10_000` — host metrics push interval.
- `LABELS` — the `vlab.*` Docker label keys injected into every deployed container.
- `MIKROTIK_NOREBOOT_FILENAME`/`MIKROTIK_NOREBOOT_CONTENT` — the shared RouterOS anti-reboot script.

**Host prerequisites** (`apps/worker/README.md`): Docker reachable at the default socket (`/var/run/docker.sock`); `containerlab` installed and runnable as root, SUID-root, or by a user in the `clab_admins` group (enforced by `checkPrerequisites()`).
