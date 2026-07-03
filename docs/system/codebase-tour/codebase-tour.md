# Codebase Tour

Welcome to the vLab codebase. This document is a guided tour for new developers: how the monorepo is laid out, what each app and package actually does, and where to find specific logic.

vLab is a **Bun** monorepo (workspaces: `apps/*`, `packages/*/*`, `tests/*`). It is split into `apps/` (the three deployable services) and `packages/` (shared libraries consumed by those services).

---

## 1. Applications (`apps/`)

### `apps/manager`

The **Manager** is the central orchestrator and API server. Built with [Elysia.js](https://elysiajs.com/) on Bun, it is the only component that talks to PostgreSQL, and the only component the Web UI talks to.

```
apps/manager/src/
  index.ts          entry point / CLI command dispatcher (serve, seed, backup, restore, reset-sessions, clear-sessions, sync-modules)
  server.ts         Elysia app assembly, startServer()/shutdown()
  env.ts            typed env schema
  db/
    index.ts        drizzle-orm/bun-sql client + migration runner
    schema/         Drizzle table definitions (one file per aggregate)
  domain/           business logic that doesn't belong to a single transport
    lab-session/    init.ts, evaluation.ts, submit.ts
    device-template/test.ts
  services/
    http/           Elysia HTTP routes, middlewares, plugins
    ws/              Waycast (WebSocket) routes for the browser
    grpc/            gRPC server + Manager<->Worker command/telemetry handlers
    queue/           BullMQ queues (lab-session, storage-cleanup, ws-disposal)
    guacamole-lite/  remote-desktop (RDP/VNC/SSH/Telnet) proxy
  seeders/          admin.ts, department.ts, instructor.ts, study-program.ts
  types/            clab.ts, db.ts, events.ts, ws.ts
  utils/            db.ts, debouncer.ts, error-formatter.ts, events.ts, file.ts, hash.ts, nrp.ts, string.ts
```

- **HTTP routes** (`services/http/routes/`) follow a resource-per-folder convention — `auth/`, `dashboard/`, `department/`, `device-category/`, `device-template/`, `evaluator/`, `file/`, `lab/` (with nested `enrollment/` and `session/`), `study-program/`, `topology-template/`, `user/` — each folder exports an `index.ts` that composes its own `create.ts`/`update.ts`/`delete.ts`/`detail.ts`/`pagination.ts` files.
- **Background jobs** run on BullMQ + Redis: a delayed `lab-session` cleanup queue (auto-submits a session once its duration elapses), an hourly `storage-cleanup` queue (orphan-file garbage collection), and a `ws-disposal` queue that backs Waycast's disconnect-grace-period scheduler so it survives manager restarts.
- **Worker dispatch** (which Worker a new lab session lands on) lives in `services/grpc/handlers/worker.ts` — see [System Architecture](../architecture/architecture.md#worker-selection).

### `apps/worker`

The **Worker** is a long-running daemon installed on each host machine that actually runs lab topologies. It never talks to PostgreSQL or Redis directly — everything flows through a single gRPC connection to the Manager.

```
apps/worker/src/
  index.ts             entry point: checks prerequisites, opens the gRPC stream, starts metrics + monitor loops
  env.ts               typed env schema (WORKER_ID, MANAGER_GRPC_URL, GUACD_HOST/PORT, CLAB_CLI_PATH, CLAB_TOPOLOGIES_PATH, CLAB_MGMT_NETWORK)
  handlers/            RPC handlers exposed to the Manager, tunneled inside the one gRPC stream
    server.ts          builds the Waycast RPC server over the gRPC bidi stream (msgpack-coded)
    clab.ts            clab:deployLab / clab:destroyLab / clab:reconcileSessions
    docker.ts           docker:pullImage / docker:measureContainerStats
    evaluator.ts        evaluator:start / evaluator:stop
  lib/
    clab.ts             topology construction from the Manager's LabConfig, deploy/destroy/reconcile logic, node hardening execs
    clab-monitor.ts      instantiates @vlab/clab-monitor
    evaluator.ts         lab-evaluation session lifecycle (start/stop, debounced teardown)
    docker.ts            dockerode client singleton
    system-metrics.ts    CPU/memory/storage sampling (os/fs, no external lib)
  services/
    client.ts            nice-grpc channel/client setup
    worker.ts             the ListenCommand stream loop + the metrics-push loop
    monitor.ts             wires @vlab/clab-monitor events to RPC pushes and evaluator sources
```

- The Manager<->Worker protocol is a single long-lived **bidirectional gRPC stream** (`WorkerService.ListenCommand`); a generic RPC framework (Waycast, msgpack-coded) is tunneled inside it. See [Communication Protocols](../communication/communication.md).
- On boot the worker refuses to start unless `containerlab version` succeeds and it has root/SUID/`clab_admins` access (`lib/clab.ts` via `packages/@vlab/clab`).
- The worker hardens Linux lab nodes at deploy time: it disables `shutdown`/`poweroff`/`reboot`/`halt` inside the container and forces a default route to the Guacamole daemon, so a student can't kill their own node or lose remote-desktop connectivity. See [Containerlab Integration](../containerlab/containerlab.md).
- Host telemetry (`services/worker.ts`, `sendMetrics`) is sent as a unary gRPC call on a **fixed 10-second timer**, not push/event-driven — worth knowing if you're touching that path.

### `apps/web`

The **Web UI** is a React 19 SPA that renders both the student and instructor experience. It communicates with the Manager only — HTTP for request/response, WebSocket for anything real-time.

```
apps/web/src/
  routes/          TanStack Router file-based routes (see frontend.md)
  components/      buttons, data-table, forms, input, layouts, mdx-plugins, pages, sections, ui (shadcn primitives)
  hooks/           form/, pagination/, state/, ws.ts (useWSData/useWSEvent/useWSAction/useWSConnectionState)
  lib/             api.ts (typed Eden-Treaty + TanStack Query client), router.ts, query.ts, middlewares.ts (route guards), ws.ts (socket.io client)
  stores/          auth-store.ts (the one truly global store; feature stores live colocated under each route's -module/stores/)
  shared/          guacamole/, topology/ — feature modules shared across routes
```

See [Frontend Architecture](../frontend/frontend.md) for routing, state, and the real-time WebSocket hook API.

---

## 2. Shared Packages (`packages/`)

### `@vlab/*` — domain logic

| Package              | What it actually does                                                                                                                                                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@vlab/shared`       | Central TypeBox schemas, enums (`deviceKindValues`, `roleValues`, `nodeHealthValues`, ...), utils, and the `standard-schema.ts` adapter (`toStandardSchema()`) that lets TypeBox schemas satisfy Waycast's `@standard-schema/spec` validation contract.              |
| `@vlab/grpc`         | The Manager<->Worker gRPC contract: a minimal `worker.proto` (one bidi-stream RPC + one unary metrics RPC) plus the `waycast` command router (`commands.ts`) and msgpack `Codec` (`codec.ts`) that ride inside it.                                                   |
| `@vlab/ws`           | The Waycast router definitions for Manager<->Browser traffic: lab-session lifecycle/telemetry, lab enrollment events, admin worker-status pushes, device-template test streaming.                                                                                    |
| `@vlab/clab`         | Thin, typed wrapper around the `containerlab` CLI — topology types, YAML writing (`Bun.YAML.stringify`), and `deploy`/`destroy`/`inspect`/`checkPrerequisites` via `Bun.spawn`. No custom YAML builder beyond the type definitions.                                  |
| `@vlab/clab-monitor` | Event-driven container lifecycle/health/interface watcher. Streams the Docker events API plus per-kind interface monitors (`ip monitor` execs for Linux, RouterOS API `listen` streams for MikroTik). No polling loop except a 5s reconnect backoff on stream error. |
| `@vlab/evaluator`    | The lab grading engine: a plugin registry of per-device-kind `EvaluationHandler`s (`linux`, `mikrotik`, `node-interface`), each exposing typed, push-driven checks. See [Lab Evaluation Engine](../evaluator/evaluator.md).                                          |

### `@jawit/*` — general-purpose utilities

| Package                 | What it does                                                                                                                                                                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@jawit/common`         | `success()`/`failure()` response-shape helpers and canned responses (`notFound`, `created`, `updated`, `deleted`) used across the Manager's HTTP routes.                                                                                                             |
| `@jawit/query`          | Wraps an Elysia Eden-Treaty client in a `Proxy` that exposes typed TanStack Query hooks (`useQuery`, `useSuspenseQuery`, `useMutation`, `usePagination`, ...) directly off the API route tree — this is what `apps/web/src/lib/api.ts`'s `api.*` object actually is. |
| `@jawit/elysia-caching` | Elysia plugin providing ETag/Last-Modified HTTP response caching via a pluggable `CacheAdapter`.                                                                                                                                                                     |
| `@jawit/paginator`      | Drizzle-ORM-aware pagination/filtering/search builder, used by the Manager's `pagination.ts` route handlers.                                                                                                                                                         |
| `@jawit/zustand-helper` | `createSelectors()` (adds a `.use.<field>()` accessor to a Zustand store) and `createModalStore()` (declarative modal-state factory) — used by nearly every feature store in `apps/web`.                                                                             |

### `packages/external/`

Forked third-party packages maintained in-repo. Currently just `mikro-routeros` — see [External Libraries](../external-libs/external-libs.md).

### A first-party dependency that isn't vendored: `waycast`

Both `@vlab/grpc` and `@vlab/ws` are built on **`waycast`**, a generic RPC/pub-sub-over-socket framework (separate repo, `github.com/Nunu27/waycast`, currently `^3.0.2`). It is not forked into `packages/external` — it's a normal npm dependency the team maintains separately — but since it owns the connection lifecycle, request/reply protocol, and disconnect-grace-period bookkeeping for _both_ the Manager<->Worker and Manager<->Browser channels, understanding it is central to understanding vLab's real-time behavior. See [Communication Protocols](../communication/communication.md).

## Next Steps

Continue to [System Architecture](../architecture/architecture.md) to see how these pieces interact at runtime — worker selection, the lab-session lifecycle, and the multi-manager scaling model.
