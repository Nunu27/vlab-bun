# Protocol: Manager ↔ Web (Socket.IO + Waycast)

Package: [`@vlab/ws`](../architecture/shared-packages.md#packagesvlabws--managerweb-real-time-protocol-contract). Consumers: [`apps/manager`](../architecture/manager.md#websocket--waycast-manager--web-frontend) (server), [`apps/web`](../architecture/web.md#real-time-features-websocket--waycast) (client).

## Transport shape

Structurally parallel to the [gRPC protocol](grpc-manager-worker.md), but the underlying transport is **Socket.IO** (not raw gRPC): the manager runs a `@socket.io/bun-engine` `Engine` at path `/ws`, sharing the main Bun HTTP listener; the browser connects with `socket.io-client`. Both sides layer **Waycast** on top for typed pub/sub (`data` routes) and RPC (`rpc` routes) semantics, using `socket.io-msgpack-parser` for binary-efficient framing.

Multi-replica support: `@socket.io/redis-streams-adapter` (backed by the shared ioredis client) keeps Socket.IO rooms/broadcasts consistent across manager replicas, so a `data` route published from one replica reaches sockets connected to any replica.

## Auth

Every socket connection authenticates via `socket.handshake.auth.session` (the same `session` cookie value used for REST), validated against the Redis-backed session store shared with HTTP auth (`services/http/middlewares/auth.ts`'s `sessions.get`). A route-level `WSMeta = { private?: Role[] }` metadata field (set per-route in `@vlab/ws`) additionally gates access by role, enforced by Waycast middleware on the manager.

## Route catalog (`packages/@vlab/ws/src/*.ts`, merged into one `AppRouter`)

Route names use waycast's **dynamic route-param** convention (`[id]`, `[sessionId]`, `[labId]`, `[interface]`); the `WSParamsOf<Name>` helper type extracts these.

### `admin.ts` — worker fleet telemetry (data routes)

| Route                  | Payload                                         | Notes                                                                          |
| ---------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------ |
| `admin:worker:new`     | Full `WorkerSchema`                             | New worker connected.                                                          |
| `admin:worker:status`  | `{id, status, lastSeen}` subset                 | Worker online/offline transition.                                              |
| `admin:worker:metrics` | `{id, usage%s, activeLabs, activeNodes}` subset | Periodic telemetry relay (sourced from the worker's `SendMetrics` gRPC calls). |

`WorkerSchema`: `id`, `status` (online/offline), `lastSeen`, `cpuCores`/`memoryMB`/`storageMB`, usage percents, `activeLabs`, `activeNodes`.

### `lab.ts` — instructor enrollment roster (data routes)

| Route                           | Payload                            |
| ------------------------------- | ---------------------------------- |
| `lab:[labId]:enrollment:new`    | New enrollment.                    |
| `lab:[labId]:enrollment:update` | `{id, status, score, lastUpdated}` |
| `lab:[labId]:enrollment:remove` | `{studentId}`                      |

### `lab-session.ts` — the core student-facing session protocol

| Route                                   | Type | Payload / Response                                                           | Notes                                                                                                                                                                                                                                                                                        |
| --------------------------------------- | ---- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lab:[id]:init`                         | RPC  | student-only; streams `info`/`warn` string replies; final `response: string` | Starts session initialization. On the manager, returns `DEFER` immediately and resolves later once the worker finishes deploying (see [manager.md](../architecture/manager.md#websocket--waycast-manager--web-frontend)).                                                                    |
| `lab-session:[sessionId]:connect`       | RPC  | student-only; payload/response both `boolean`                                | Connect/reconnect signal for the terminal; implements single-owner-tab locking (`clientId = "<connectionId>:<requestId>"`). A second tab without `force=true` is rejected.                                                                                                                   |
| `lab-session:[sessionId]:client-change` | data | `string \| null` (session id)                                                | Signals which client currently owns the session's connection (used by the frontend to show "session taken over" modals).                                                                                                                                                                     |
| `lab-session:[sessionId]:ended`         | data | —                                                                            | Session force-ended (submitted/expired/destroyed).                                                                                                                                                                                                                                           |
| `lab-session:[sessionId]:checks`        | data | `{id, completed}`                                                            | Per-check pass/fail push from the evaluator pipeline.                                                                                                                                                                                                                                        |
| `node:[id]:health`                      | data | `NodeHealth` union                                                           | Mirrors [`@vlab/clab-monitor`'s health states](../architecture/clab-monitor.md#health-state-machine) — **independently duplicated here**, see the enum-duplication note in [shared-packages.md](../architecture/shared-packages.md#packagesvlabshared--cross-app-types-enums-schemas-utils). |
| `node:[id]:interfaces:[interface]`      | data | `string[]`                                                                   | Current IP/addr list for that interface.                                                                                                                                                                                                                                                     |

### `device-template.ts` — admin device testing (RPC)

| Route                  | Type | Payload / Response                                                                                                  | Notes                                                        |
| ---------------------- | ---- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `device-template:test` | RPC  | admin-only; template spec in, streams `info`/`warn`/`stats: {cpuCores, memoryMB}` replies, final `response: string` | Live-tests a device template's spin-up before publishing it. |

## Waycast composition details

`packages/@vlab/ws/src/index.ts` merges `adminRouter`, `deviceTemplateRouter`, `labSessionRouter`, `labRouter` into one `Waycast<WSMeta>({ maxDisconnectionDuration: 60000 })`. The `maxDisconnectionDuration` is the grace period Waycast waits after a socket disconnects before firing `onDispose` callbacks for any RPC "ownership" that socket held — this is what allows a student to briefly refresh the page without losing their `lab-session:[sessionId]:connect` lock. On the manager, this disposal scheduling is backed by BullMQ (`services/queue/ws-disposal.ts`) rather than an in-memory timer, so it survives a manager restart/replica failover.

## Frontend consumption

See [web.md § Real-time features](../architecture/web.md#real-time-features-websocket--waycast) for the `useWSData`/`useWSEvent`/`useWSAction`/`useWSConnectionState` hooks that wrap these routes, and the concrete feature implementations (enrollment roster, admin dashboard, live session, node console, device-template test).
