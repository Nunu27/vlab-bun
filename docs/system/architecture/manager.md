# Manager (`apps/manager`)

The Manager is the single central, multi-tenant Elysia.js/Bun process. It owns the Postgres database (via Drizzle ORM), serves the REST API and Socket.IO/Waycast WebSocket gateway consumed by `apps/web`, and runs a gRPC server that Worker daemons (`apps/worker`) connect to as long-lived streaming clients. Redis is used pervasively (sessions, HTTP caching, cross-replica pub/sub, BullMQ queues).

Related: [architecture/overview.md](overview.md) · [protocols/grpc-manager-worker.md](../protocols/grpc-manager-worker.md) · [protocols/websocket-waycast.md](../protocols/websocket-waycast.md) · [domain/data-model.md](../domain/data-model.md)

## Directory structure (`src/`)

| Path | Purpose |
|---|---|
| `src/index.ts` | CLI entrypoint/router — dispatches to `serve`, `seed`, `backup`, `restore`, `reset-sessions`, `clear-sessions`, `sync-modules`. Installs global `unhandledRejection`/`uncaughtException` handlers (log-and-continue, since this is a shared multi-tenant process). |
| `src/server.ts` | Composes the Elysia app + WS engine + gRPC server, wires graceful shutdown, starts everything (`startServer`). |
| `src/env.ts` | Typebox-validated environment config (fails fast on invalid `.env`). |
| `src/db/` | Drizzle client (`index.ts`) + `schema/` (one file per entity group) + migration runner. |
| `src/domain/` | Business logic decoupled from transport: `lab-session/{init,submit,evaluation}.ts`, `device-template/test.ts`. |
| `src/services/http/` | Elysia HTTP composition: `plugins/` (cross-cutting: logging, security, docs, error handling, fallback), `middlewares/` (auth/session, caching, toast), `routes/` (REST API modules). |
| `src/services/grpc/` | gRPC server for Worker daemons: `index.ts` (server setup + cross-manager Redis relay), `handlers/{worker,dispatch,monitor,evaluator,actions}.ts`. |
| `src/services/ws/` | Socket.IO + Waycast realtime gateway: `index.ts` (transport/adapter wiring), `routes/{lab-session,device-template}.ts` (Waycast RPC/data handlers). |
| `src/services/queue/` | BullMQ queues/workers: lab-session teardown, storage cleanup, Waycast WS-disposal scheduling. |
| `src/services/guacamole-lite/` | Embeds `guacamole-lite` to broker Guacamole (RDP/VNC/SSH/Telnet) console access with signed, encrypted connection tokens. |
| `src/commands/` | One-off CLI operations: `backup.ts`, `restore.ts`, `reset-sessions.ts`, `clear-sessions.ts`, `sync-modules.ts` (imports `docs/modules/*.md` into the `lab` table — see [course-content.md](../course-content.md)). |
| `src/seeders/` | DB seeders (`admin`, `instructor`, `department`, `study-program`), run via `bun run seed`. |
| `src/lib/` | Low-level singletons: `logger.ts` (pino), `redis.ts` (ioredis + msgpack helpers), `storage.ts` (S3mini object storage client + orphan cleanup). |
| `src/types/` | Shared internal types: `clab.ts` (LabNode/LabLink/LabConfig), `events.ts` (typed EventEmitter helper), `ws.ts` (WSContext = session), `db.ts` (Transaction type). |
| `src/utils/` | `db.ts` (affected-row counting), `debouncer.ts`, `error-formatter.ts` (Postgres/Drizzle → HTTP error mapping), `events.ts` (`waitForEvent`), `file.ts` (embedded-file extraction from markdown), `hash.ts`, `nrp.ts` (student ID/NRP parsing for CAS), `string.ts`. |
| `migrations/` + `migrations/meta/` | Drizzle-kit generated SQL migrations, applied automatically at boot. |
| `lab_backup/` | Output target of `bun run backup` (msgpack DB dump + downloaded S3 files). |

## Entry point & bootstrap composition

- **`src/index.ts`**: a `commands` record mapping CLI subcommands to dynamically-imported handlers. Default command is `serve`.
- **`src/server.ts`**:
  - Builds `const app = new Elysia().use(httpHandler)` then attaches a catch-all `/ws` route that hands the raw `Bun.serve` request/socket off to the Socket.IO engine (`ws.engine.handleRequest`) — so HTTP and WS share one Bun listener/port (`env.PORT`).
  - `startServer()` boot sequence:
    1. `cache.clear()` — flush Redis-backed HTTP cache.
    2. `checkAndRunMigration()` — Drizzle migrations run automatically at startup (not just via `drizzle-kit migrate`).
    3. `resetStaleWorkers()` — mark any workers this manager instance previously owned as `offline` (crash recovery).
    4. `guacamoleLite.init()`.
    5. `app.listen({ hostname: "0.0.0.0", port: env.PORT, ...ws.engine.handler() })`.
    6. `grpcServer.listen("0.0.0.0:" + env.GRPC_PORT)`.
    7. Schedules the recurring `storage-cleanup` BullMQ job (cron `0 * * * *`, hourly).
  - `shutdown()` (SIGTERM/SIGINT) forcibly closes, in order: gRPC server → Elysia app → Socket.IO → Guacamole → both BullMQ workers/queues → Redis → Postgres client.

## HTTP composition (Elysia plugin chain)

`src/services/http/index.ts` — the `httpHandler` Elysia instance chains, in order:

`logging` → `security` (Helmet CSP) → `documentation` (OpenAPI at `/docs`, gated by `ENABLE_OPENAPI`) → `errorHandler` (global `.error()`/`.onError()` mapping Drizzle/validation errors to `{message, errors}` JSON) → `routes` (`/api/*`) → static assets (`/assets`, production only) → `fallback` (SPA `index.html` catch-all + JSON 404 for unmatched `/api/*`).

Cookie config: `{ secrets: env.COOKIE_SECRET, secure: inProduction }` set at the top-level Elysia instance.

### API route modules (`src/services/http/routes/index.ts`, prefix `/api`)

| Module | Prefix | Responsibility |
|---|---|---|
| `auth` | `/api/auth` | `cas.ts` (CAS SSO login/ticket validation + auto-provisioning of student accounts from CAS attributes incl. NRP parsing), `login.ts` (email/password), `logout.ts`, `me.ts` (current user + role-specific profile, cached+personalized), `change-password.ts`. |
| `dashboard` | `/api/dashboard` | `admin.ts` (worker fleet status/metrics), `instructor.ts`, `student.ts` — per-role landing data. |
| `lab` | `/api/lab` | `create/detail/update/delete/pagination.ts` (lab CRUD, instructor-owned), `enrollment/{list,toggle}.ts` (student enrollment management), `session/{detail,list,node}.ts` (student's active/past lab sessions and per-node Guacamole token retrieval). |
| `department` | `/api/department` | CRUD + pagination for academic departments. |
| `study-program` | `/api/study-program` | CRUD + pagination, scoped to a department. |
| `user` | `/api/user` | `change-password.ts` shared + `admin/`, `instructor/`, `student/` sub-routers each with CRUD+pagination (role-specific user management, admin-only). |
| `device-category` | `/api/device-category` | CRUD + pagination for grouping device templates (name + color). |
| `device-template` | `/api/device-template` | CRUD + `list` + pagination — the catalog of containerlab node images/kinds usable in topologies. |
| `topology-template` | `/api/topology-template` | Reusable topology snippets (CRUD + pagination), stored as `LabTopology` JSON. |
| `evaluator` | `/api/evaluator` | `list.ts` — exposes available automated check types from `@vlab/evaluator`. |
| `file` | `/api/file` | `upload.ts` (content-hash-deduplicated uploads to S3/MinIO via `s3mini`, instructor-only, allow-listed MIME types), `view.ts` (serve/proxy stored files). |

All routers use `createRouter()` (`src/services/http/plugins/system.ts`) which attaches an `ENTITY` decoration (kebab-case tag name derived from `detail.tags`) used for generating consistent "Not Found"/"Created"/"Updated" messages (`@jawit/common` `responses`/`success`/`failure` helpers) and cache-key namespacing.

## Auth mechanism

Implemented in `src/services/http/middlewares/auth.ts` — **opaque cookie-session backed by Redis**, not JWT:

- `sessions.get(id)` reads `session:rest:<cookieValue>` → user id → `session:data:<userId>` (msgpack-encoded `Session` object `{id, role, ...}`), both with `SESSION_TTL` (default 3h) sliding expiry (`extend()` called in the `auth` macro's `afterResponse` on any non-error response).
- Elysia **macros** compose access control declaratively on routes:
  - `auth: true` — resolves `session` from the `session` cookie (auto-generates a UUIDv7 cookie value if absent).
  - `guest: true` — rejects (400) if already logged in.
  - `protected: true` — 401 if no session data.
  - `private: (roles: Role[])` — `protected` + 403 if `session.data.role` not in the allowed list. Roles: `student | instructor | admin` (`@vlab/shared/enums`).
- **Two login flows**:
  - **CAS SSO** (`routes/auth/cas.ts`) — redirects to the institution's CAS server, validates the service ticket via XML `serviceValidate`, and **auto-provisions** a `student` user + `students` row on first login (parses NRP via `utils/nrp.ts` to derive `year`/`degreeLevel`, matches `Jurusan` to a `study_program`).
  - **Password login** (`routes/auth/login.ts`) — email + `Bun.password.verify` against `users.passwordHash` (used for instructor/admin accounts seeded manually, not via CAS).
- `change-password.ts` requires the old password only if one is already set (CAS-only accounts can set a first password).
- Same session mechanism secures WebSocket connections: `services/ws/index.ts` validates `socket.handshake.auth.session` against the same Redis-backed `sessions.get()` before allowing a connection, and Waycast middleware additionally enforces per-route `meta.private` role checks.

## Database — Drizzle ORM

`src/db/index.ts`: `drizzle({ schema, casing: "snake_case", connection: { url: DATABASE_URL, idleTimeout: 900, connectionTimeout: 30 } })` using the **Bun SQL driver** (`drizzle-orm/bun-sql`), not `postgres.js`/`node-postgres`. `checkAndRunMigration()` runs `drizzle-orm/bun-sql/migrator`'s `migrate()` against `./migrations` — **applied automatically on every server start**.

`drizzle.config.ts`: schema dir `./src/db/schema`, output `./migrations`, dialect `postgresql`, `casing: "snake_case"`.

Full entity reference: [domain/data-model.md](../domain/data-model.md).

Migration workflow (per `AGENTS.md` §6): edit schema → `bun run drizzle:generate --name <action>_<entity>_<detail>` → migrations auto-apply on next boot (manual `drizzle:migrate` rarely needed).

## gRPC (Manager ↔ Worker)

Manager is the **gRPC server**; each Worker daemon is a long-lived **streaming client**. Full protocol details in [protocols/grpc-manager-worker.md](../protocols/grpc-manager-worker.md). Manager-side responsibilities (`src/services/grpc/`):

- **`handlers/worker.ts`** — `WorkerServiceImpl.listenCommand`: on a worker's first message (`workerSpec` handshake — cpu/mem/storage, guacd host/port):
  1. Upserts the `worker` row (`onConflictDoUpdate`), detects guacd config changes and regenerates all `lab_session_node.token`s in the background if so.
  2. Emits `admin:worker:new` or `admin:worker:status` over WS.
  3. Builds a Waycast client over a custom `WaycastClientTransport` bridging the gRPC stream (base64-encoded over an `AsyncQueue<CommandRequest>`).
  4. Subscribes to a Redis pub/sub channel `vlab:worker-action:<workerId>` (cross-manager forwarding, see below).
  5. Attaches `monitor` and `evaluator` handlers, registers the client in `connectedWorkers: Map<workerId, client>`.
  6. Calls `reconcileWorkerSessions()` — asks the worker to destroy any Containerlab labs not tracked as an active (unsubmitted) `lab_session` in the DB (handles manager/worker crash-restart drift).
  7. On disconnect: reconciles teardown, marks worker `offline`, resets `activeLabs`/`activeNodes`/`deployingLab` to 0, emits `admin:worker:status`.
  - `sendMetrics` (unary) — worker pushes CPU/mem/storage usage percentages; manager updates `worker` row and emits `admin:worker:metrics`.

- **`handlers/dispatch.ts`** — `dispatchWorkerAction(actionName, workerId, payload)`: if the target worker is connected to *this* manager instance, runs the action handler locally; otherwise **publishes it over Redis** (`vlab:worker-action:<workerId>` channel, msgpack-encoded) so whichever manager instance owns that worker's gRPC stream executes it. This is the cross-manager-replica coordination mechanism. `handlers/index.ts` sets up the global Redis subscriber that receives and executes forwarded actions.

- **`handlers/actions.ts`** — the `actionHandlers` map wiring dispatched action names to domain functions: `lab:initSession` → `initSession`, `lab:destroy` → local worker `clab:destroyLab` + queue removal, `evaluator:start`/`evaluator:stop` → domain evaluation functions, `device:testInit`/`device:testCleanup` → device-template test flow.

### Worker selection & scheduling

`handlers/worker.ts` exposes:

- **`tryGetAvailableWorkerId`** — `SELECT ... FOR UPDATE SKIP LOCKED` on `worker` filtering by `status=online`, free CPU/mem capacity ≥ cost, `deployingLab < cpuCores`, ordered by `activeLabs` ascending (load-balancing), then atomically increments `activeLabs`/`deployingLab`.
- **`waitForAvailableWorkerId`** — retries with full exponential backoff (500ms→5s, factor 1.5, 30s timeout) when no worker has capacity, invoking an `onWait` callback so the caller can stream "high demand" status back to the user over WS.
- **`sendCommandToWorker`** — promise wrapper over a Waycast RPC call to a specific connected worker's client.

- **`handlers/monitor.ts`** — consumes `monitor:node-health`/`monitor:interface-update` data events per connected worker: updates `lab_session_node.health`/`interfaces` in Postgres (interface updates debounced 750ms via `utils/debouncer.ts`), invalidates the `lab:*:lab-session:<sessionId>` HTTP cache, and re-emits over WS (`node:[id]:health`, `node:[id]:interfaces:[interface]`). Special-cases `lab.startsWith("test-")` (device-template test sessions) by emitting to an in-process `tempNodeEvents` EventEmitter instead of touching the DB.

- **`handlers/evaluator.ts`** — consumes `evaluator:checkChanged` events, upserts `lab_session_check`, re-emits `lab-session:[sessionId]:checks` over WS.

## WebSocket / Waycast (Manager ↔ Web frontend)

Transport: **Socket.IO** (`src/services/ws/index.ts`) bound to a `@socket.io/bun-engine` `Engine` at path `/ws`, sharing the same Bun HTTP listener as the REST API. Uses `socket.io-msgpack-parser` for binary-efficient framing and `@socket.io/redis-streams-adapter` (backed by the shared ioredis client) so Socket.IO rooms/broadcasts work across multiple manager replicas.

Full route catalog: [protocols/websocket-waycast.md](../protocols/websocket-waycast.md). Wiring summary:

- `io.use(...)` middleware authenticates every socket via `socket.handshake.auth.session` against the same Redis session store used by HTTP, attaching `socket.data.session`.
- A `WaycastServerTransport` bridges Socket.IO's single `"message"` event to Waycast's `onMessage`/connection/disconnection hooks; a `WaycastAdapter` maps Waycast's pub/sub `subscribe`/`unsubscribe`/`publish` onto Socket.IO room join/leave/emit.
- `appRouter.buildServer<WSContext>()` is constructed with a `disposalScheduler` (`wsDisposalScheduler`, backed by BullMQ) so RPC "ownership" (e.g., a lab session's connection lock) can be scheduled for cleanup after a grace period following disconnect (`maxDisconnectionDuration: 60000`), and a middleware enforcing per-route `meta.private` role allowlists.
- Notable route behavior (`src/services/ws/routes/lab-session.ts`):
  - `lab:[id]:init` RPC — validates enrollment/publish window/attempt limits, builds `LabNode`/`LabLink` arrays, waits for an available worker (streaming "info"/"warn" replies), and **dispatches `lab:initSession` then returns `DEFER`** — the actual RPC response is resolved asynchronously later by `domain/lab-session/init.ts` once the worker finishes deploying.
  - `lab-session:[sessionId]:connect` RPC — implements **single-owner-tab locking**: `clientId` stored as `"<connectionId>:<requestId>"`; a second tab trying to connect without `force=true` is rejected, else it takes over and starts the evaluator via `dispatchWorkerAction("evaluator:start", ...)`.
  - `ws.server.onDispose("lab-session:[sessionId]:connect", ...)` — when the owning connection disconnects (after the Waycast disposal grace period), clears `clientId` and stops the evaluator.

## Background jobs / Queues / Redis

Redis (`src/lib/redis.ts`) is used for four distinct purposes:

1. **Session store** (opaque REST/WS session cookies — see Auth above).
2. **HTTP response caching** (`@jawit/elysia-caching` plugin, `services/http/middlewares/caching.ts`) — msgpack-encoded values + ETag (md5) + metadata, keyed/invalidated per-entity (e.g. `lab:<labId>:lab-session:<id>`), with a `personalized` macro variant that suffixes the cache key with the user id.
3. **Pub/Sub** — cross-manager worker-action forwarding (`vlab:worker-action:<workerId>`) and the Socket.IO Redis-streams adapter.
4. **BullMQ backing store** for three queue/worker pairs (`src/services/queue/`):
   - **`lab-session` queue/worker** — one delayed job per active session (`jobId = sessionId`, delay = time until `dueDate`), triggers `submitSession()` to auto-grade and tear down a session when its time is up. Removed early if the student submits manually.
   - **`storage-cleanup` queue/worker** — hourly cron, runs `storageCleanup()` (`lib/storage.ts`) which finds `file` rows older than `STORAGE_CLEANUP_WINDOW_HOURS` (default 24h) not referenced by any `lab.cover`/`lab_attachments`/`lab_embedded_file`, deletes them from S3/MinIO and the DB.
   - **`ws-disposal` queue/worker** — implements Waycast's `WaycastDisposalScheduler` interface using BullMQ delayed jobs, so WS-side RPC ownership disposal survives manager restarts and works across replicas.

## Guacamole integration

`src/services/guacamole-lite/index.ts` embeds the `guacamole-lite` npm library to broker RDP/VNC/SSH/Telnet access to lab devices through a browser-based client:

- Runs its own WebSocket listener on `env.DISPLAY_PORT` (default 8080) — **separate port from the main API**.
- `generateNodeToken(connection, kind, ip, guacdHost, guacdPort)` builds an AES-256-CBC-encrypted, signed connection token (keyed by `env.GUACD_SECRET`) embedding protocol type/hostname/port/credentials + an `expiration`; special-cased for `mikrotik_ros` (appends `+t` to username per RouterOS Guacamole quirk).
- Tokens are generated at lab-session-node creation time (`domain/lab-session/init.ts`) and stored in `lab_session_node.token`; regenerated in bulk if a worker's `guacdHost`/`guacdPort` changes.
- Session registry backed by Redis (`session:guac:<id>`, 1-day TTL) rather than in-memory, so it survives restarts/works across replicas.
- `processConnectionSettings` callback rejects expired tokens.

## Domain layer details

- **`domain/lab-session/init.ts`** (`initSession`) — orchestrates: insert `lab_session` row → invalidate cache + emit enrollment update → RPC `clab:deployLab` to the worker → verify all requested nodes actually deployed (rolls back/destroys + deletes the session row + decrements `worker.activeLabs` on partial failure) → look up device templates + worker guacd config → bulk-insert `lab_session_node` rows with generated Guacamole tokens → increment `worker.activeNodes` → resolve the deferred WS reply with the new `sessionId` → schedule the `lab-session` BullMQ auto-submit job at `dueDate`.
- **`domain/lab-session/submit.ts`** (`submitSession`) — computes the final weighted score from `lab_session_check` rows against the lab's `checks` weight map, marks `submittedAt`, deletes `lab_session_node` rows, decrements worker `activeLabs`/`activeNodes`, invalidates caches, emits `lab-session:[sessionId]:ended` + `lab:[labId]:enrollment:update`, then dispatches `lab:destroy` to actually tear down containers (tolerates worker being unreachable, logging a warning).
- **`domain/lab-session/evaluation.ts`** (`startEvaluation`/`stopEvaluation`) — builds the `nodeMap`/`sessionChecks`/current `values` payload from DB state and RPCs `evaluator:start`/`evaluator:stop` to the worker.
- **`domain/device-template/test.ts`** (`testDeviceOnWorker`/`cleanupDeviceTest`) — used by the device-template admin UI to "trial run" a device: pulls the image, deploys a single-node throwaway topology, waits (up to 120s) for a health-check event via the in-process `tempNodeEvents` emitter, generates a Guacamole token, and measures actual container CPU/memory usage to suggest `cpuCostCores`/`memoryCostMB` values for the template.

## Config & scripts

**`package.json` scripts**: `dev` (watch mode via `bun --watch`, piped through `pino-pretty`), `seed`, `backup`, `restore`, `sync-modules`, `build` (compiles to a single Bun binary at `../../out/manager/app` + copies `migrations/`), `typecheck`, `drizzle:generate` / `drizzle:migrate` / `drizzle:studio`.

**Key dependencies**: `elysia`, `drizzle-orm` + `drizzle-kit`, `bullmq`, `ioredis`, `nice-grpc`, `socket.io` + `@socket.io/bun-engine` + `@socket.io/redis-streams-adapter` + `socket.io-msgpack-parser`, `guacamole-lite`, `s3mini`, `bcryptjs`/`Bun.password`, `@msgpack/msgpack`, `fast-xml-parser` (CAS XML), `waycast` (custom RPC framework shared with `@vlab/grpc`/`@vlab/ws`), internal workspace packages `@jawit/common|elysia-caching|paginator`, `@vlab/evaluator|grpc|shared|ws`.

**Environment variables** (`src/env.ts`, validated with Typebox at boot — process exits on invalid config):

| Var | Default | Notes |
|---|---|---|
| `MANAGER_ID` | — | Identifies this manager replica; stamped on `worker.managerId` and used by `resetStaleWorkers()`. |
| `NODE_ENV` | — | `development\|production\|test`. |
| `LOG_LEVEL` | `info` | pino level. |
| `ENABLE_OPENAPI` | `false` | Gates `/api/docs` OpenAPI UI. |
| `PORT` | `3000` | Main HTTP+WS port. |
| `GRPC_PORT` | `50051` | Worker gRPC port. |
| `DISPLAY_PORT` | `8080` | Guacamole-lite's own WS listener. |
| `DATABASE_URL` | — | Postgres connection string. |
| `REDIS_URL` | — | Redis connection string. |
| `SESSION_TTL` | `10800` (3h) | Sliding session expiry, seconds. |
| `S3_ENDPOINT`/`S3_ACCESS_KEY`/`S3_SECRET_KEY` | — | MinIO/S3-compatible storage. |
| `STORAGE_CLEANUP_WINDOW_HOURS` | `24` | Grace period before orphaned files are deleted. |
| `BASE_URL` | — | Public URL, used to build the CAS `service` callback and post-logout redirect. |
| `CAS_BASE_URL` | `https://login.pens.ac.id` | Institutional CAS server. |
| `COOKIE_SECRET` | — (32–64 chars) | Elysia cookie signing secret. |
| `GUACD_SECRET` | — (32–64 chars) | AES key for Guacamole connection tokens. |

**Other config files**: `drizzle.config.ts` (drizzle-kit CLI config, mirrors `db/index.ts` settings), `tsconfig.json` (path alias `@manager/* → ./src/*`, `moduleResolution: bundler`, strict mode, Bun types), `.env`/`.env.example`.
