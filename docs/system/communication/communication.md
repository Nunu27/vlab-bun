# Communication Protocols

vLab has two real-time channels — Manager<->Worker and Manager<->Browser — and both are built on the same generic RPC/pub-sub framework, **Waycast**, rather than two bespoke protocols.

*(See `communication-flow.excalidraw` in this directory for a visual overview of the Manager as a hub between the Web UI and the Workers.)*

---

## 0. Waycast — the framework underneath both channels

**Waycast** (`waycast` on npm, `^3.0.2`, maintained in a sibling repo at `github.com/Nunu27/waycast`) is a transport-agnostic RPC + pub/sub router. It is not vendored into `packages/external` — it's a first-party dependency the team maintains separately — but it owns the pieces that used to be hand-rolled per channel:

- **Route definitions**: `.data(name, schema)` for server->client push events, `.rpc(name, { payload, response, replies? })` for client->server request/response (optionally with named streaming "reply" channels for progress updates, like `info`/`warn`/`stats` during a device-template test, or `checkChanged` during evaluation).
- **Validation**: routes accept any [Standard Schema](https://standardschema.dev/) (`@standard-schema/spec`)-compliant validator. vLab authors all its schemas in TypeBox and bridges them via `toStandardSchema()` in `packages/@vlab/shared/src/standard-schema.ts` — so TypeBox stays the authoring DSL, but the router itself is validator-agnostic.
- **Codec**: pluggable wire encoding. vLab supplies `msgpackCodec` (`packages/@vlab/grpc/src/codec.ts`) — `@msgpack/msgpack` encode/decode, base64-wrapped — for the Manager<->Worker channel. The Manager<->Browser socket.io channel uses `socket.io-msgpack-parser` for binary framing at the socket.io layer itself.
- **Connection/dispose lifecycle**: Waycast tracks per-connection request ownership and supports a "disconnect grace period" (`maxDisconnectionDuration`) before a request's resources are torn down, via a pluggable `DisposalScheduler`. vLab backs this with a BullMQ-based scheduler (`apps/manager/src/services/queue/ws-disposal.ts`) instead of the in-memory default, so the grace period survives a Manager restart and works across replicas.
- **`DEFER`**: an RPC handler can return the `DEFER` sentinel to say "the real response will arrive later via `server.reply()`" instead of returning synchronously — used for anything that depends on a Worker round-trip (e.g. lab-session init has to wait on Worker selection and deployment).

Both `@vlab/grpc` and `@vlab/ws` are thin, typed route definitions built with `new Waycast()` — they differ only in transport (gRPC-tunneled vs. socket.io) and in which side is client vs. server.

---

## 1. Manager <-> Worker Communication

There is exactly **one** transport between a Manager instance and a connected Worker: a bidirectional gRPC stream. Everything — orchestration commands, telemetry, evaluator results — rides inside it.

### The gRPC stream

`packages/@vlab/grpc`'s `worker.proto` defines a single service, `WorkerService`, with two RPCs:

- `ListenCommand(stream CommandPayload) returns (stream CommandRequest)` — the Worker opens this as a client and keeps it open for its entire lifetime. The first message it sends is a `WorkerSpec` handshake (`cpuCores`, `memoryMb`, `storageMb`, `guacdHost`, `guacdPort`); the Manager uses it to upsert the `workers` row and regenerate Guacamole tokens if `guacdHost`/`guacdPort` changed. After the handshake, both directions carry an opaque `bytes payload` — the Waycast RPC protocol, msgpack-coded.
- `SendMetrics(MetricsRequest) returns (MetricsResponse)` — a unary call the Worker makes every 10 seconds on a fixed timer to report CPU/memory/storage usage percentages.

Why tunnel a whole RPC framework inside one stream instead of exposing many gRPC methods? It means the Worker only needs one persistent connection and one reconnect loop; adding a new command (`clab:deployLab`, `docker:pullImage`, `evaluator:start`, ...) is just a new Waycast route, not a new proto message or generated method.

**Reconnection:** if the stream errors or ends, the Worker waits 5 seconds and reconnects (`apps/worker/src/services/worker.ts`) — a fixed delay, not exponential backoff. On reconnect, the Manager's handler re-attaches monitor callbacks and calls `clab:reconcileSessions` so the Worker can destroy any locally-deployed lab whose session the Manager no longer considers active (crash recovery for both sides).

**Cross-instance dispatch:** a Worker's stream is pinned to whichever Manager replica it connected to. If a different replica needs to send that Worker an action, it publishes a msgpack-encoded `{actionName, payload}` to the Redis channel `vlab:worker-action:<workerId>`; the owning replica picks it up and executes it locally.

### What actually gets sent (`packages/@vlab/grpc/src/commands.ts`)

| Route | Direction | Purpose |
|---|---|---|
| `clab:deployLab` / `clab:destroyLab` / `clab:reconcileSessions` | Manager -> Worker (RPC) | Provision/tear down/reconcile Containerlab topologies |
| `docker:pullImage` / `docker:measureContainerStats` | Manager -> Worker (RPC) | Pre-pull an image; one-shot CPU/memory read for cost estimation |
| `evaluator:start` / `evaluator:stop` | Manager -> Worker (RPC) | Start or stop grading a session; `evaluator:start` streams `checkChanged` reply events as individual checks flip |
| `monitor:node-health` / `monitor:interface-update` | Worker -> Manager (data/push) | Live container health and interface changes, sourced from `@vlab/clab-monitor` |

---

## 2. Manager <-> Web UI Communication

The Web UI never talks to a Worker. Everything goes through the Manager, over two separate channels.

### HTTP REST API (Elysia.js)

Request/response operations — login, listing lab templates, viewing historical scores — go through Elysia HTTP routes under `/api`. The frontend consumes them via `@jawit/query`, which wraps an Eden-Treaty client in typed TanStack Query hooks (`api.lab.pagination.useQuery()`, `api.file.upload.post.useMutation()`, etc.) so there's no hand-written fetch/hook boilerplate — see [Frontend Architecture](../frontend/frontend.md).

### WebSocket (Waycast, msgpack-framed)

When a student opens a lab session, the browser opens a `socket.io-client` connection (`path: "/ws"`, `parser: socket.io-msgpack-parser`) authenticated via the session cookie, and builds a Waycast client on top of it (`apps/web/src/lib/ws.ts`). This is the *same* Waycast framework as the Manager<->Worker channel, just over socket.io instead of a gRPC tunnel, and using its default `jsonCodec`-shaped route definitions (the msgpack framing here happens at the socket.io parser level, not via `@vlab/grpc`'s `msgpackCodec`).

`packages/@vlab/ws` defines four route groups: `labSessionRouter` (session connect/telemetry/checks, node health/interfaces), `labRouter` (enrollment events), `adminRouter` (worker status pushes for the admin dashboard), and `deviceTemplateRouter` (the test-connection RPC with `info`/`warn`/`stats` reply streams).

The socket connects once after login and disconnects on logout (`useAuthStore` subscription in `lib/ws.ts`) — not per-component. Components subscribe/unsubscribe to individual routes via hooks (`useWSData`, `useWSEvent`, `useWSAction`, `useWSConnectionState` — see [Frontend Architecture](../frontend/frontend.md)) that mount/dispose with the component's lifecycle.

#### The session take-over race (fixed)

A student can have a lab session open in two tabs, or retry the "connect" call from a flaky network. The `lab-session:[sessionId]:connect` RPC used to key ownership on the raw socket connection id; the manager's dispose handler cleared ownership by matching that same bare id. That's a race: if a browser tab issued the connect RPC twice in quick succession (e.g. a conflict-check call immediately followed by "take over"), `useWSAction` would cancel the first in-flight call — and that stale call's dispose handler could still fire *after* the second call had already re-claimed the session, wiping out the legitimate new owner.

The fix (`apps/manager/src/services/ws/routes/lab-session.ts`) keys ownership on `` `${connectionId}:${requestId}` `` instead of the bare connection id, and the dispose handler only clears the DB row if the *specific* dying request was the current owner. The frontend-visible half of this is the `session-conflict-modal`/`session-overriden-modal` pair: opening a session soft-connects without taking over; if the server reports it's already claimed, the student is offered "Take Over Session," and any other tab currently holding the session gets a `lab-session:[sessionId]:client-change` push telling it it's been overridden.

### WebSocket (Guacamole Remote Access)

Terminal access (SSH/VNC/RDP/Telnet) into lab nodes is a **separate** WebSocket connection, unrelated to the Waycast channel above. The frontend's Guacamole client connects to the Manager, which (`apps/manager/src/services/guacamole-lite/`) validates an AES-256-CBC-encrypted, time-limited connection token and proxies raw Guacamole protocol frames to `guacd`, keeping the Worker's real IP hidden. Session state for this proxy lives in Redis (24h TTL), not in-process, so it survives a Manager restart or gets picked up by another replica.
