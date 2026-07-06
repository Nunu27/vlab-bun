# Architecture Overview

vLab is a virtual networking-lab platform built around a **Manager–Worker** architecture. Students and instructors interact with the **Manager** through a web frontend; the Manager schedules and drives one or more **Worker** daemons, each running on a host machine that has Docker + [Containerlab](https://containerlab.dev/) installed, to provision and tear down containerized network topologies (routers, switches, hosts) for hands-on labs.

See also: [`docs/deployment`](../../deployment/index.md) for how these pieces are actually deployed (Docker Swarm all-in-one vs. manual multi-host).

## The three apps

| App                          | Package         | Role                                                                                                                                                                                  |
| ---------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`apps/manager`](manager.md) | `@vlab/manager` | Central Elysia.js API + orchestrator + sole database owner. Multi-tenant, horizontally replicable.                                                                                    |
| [`apps/worker`](worker.md)   | `@vlab/worker`  | Long-running daemon on each host machine. Provisions/tears down Containerlab topologies, monitors container health, runs live grading checks. One instance per physical/virtual host. |
| [`apps/web`](web.md)         | `@vlab/web`     | React 19 SPA (built and served **by** the Manager — see below). Instructor/admin/student UI.                                                                                          |

## System context diagram

See [`../diagrams/system-context.mmd`](../diagrams/system-context.mmd) for the full picture. In short:

```
Browser (apps/web SPA)
   │  HTTP (Eden Treaty / REST)          │  WebSocket (Socket.IO + Waycast)
   ▼                                     ▼
                  apps/manager (Elysia.js)
   │  Postgres (Drizzle ORM)   │ Redis (sessions/cache/queues/pubsub)  │ S3/MinIO (files)
   │
   │  gRPC bidi stream (Waycast over msgpack over protobuf bytes)
   ▼
                  apps/worker (per host)
   │  Docker Engine API (dockerode)      │ Containerlab CLI (Bun.spawn)
   ▼
           Deployed lab containers (routers/switches/hosts)
   │
   ▼
      guacd (Apache Guacamole daemon) ── in-browser console access (RDP/VNC/SSH/Telnet)
```

## Why this shape

- **Manager owns all state.** Postgres is the single source of truth for labs, sessions, users, and the worker fleet. Workers are stateless with respect to business data — they only know about the Containerlab processes/containers they're currently running, and reconcile against the Manager's view on every (re)connect (`clab:reconcileSessions`).
- **One long-lived gRPC stream per worker**, not request/response polling. The Manager is the gRPC **server**; each Worker daemon is a **streaming client** that opens a single bidirectional stream (`ListenCommand`) for its entire lifetime and multiplexes all commands/events over it via a custom RPC layer called **Waycast** (see [protocols/grpc-manager-worker.md](../protocols/grpc-manager-worker.md)). This avoids polling entirely — health/interface updates, evaluator results, and dispatched commands are all pushed, not pulled.
- **The same Waycast pattern is reused for Manager↔Web**, over Socket.IO instead of gRPC (see [protocols/websocket-waycast.md](../protocols/websocket-waycast.md)). This is why the wire-protocol code in `@vlab/grpc` and `@vlab/ws` looks structurally similar.
- **Horizontally replicable Manager.** Because a given Worker's gRPC stream terminates on exactly one Manager replica, cross-replica coordination (e.g. "tell worker X to destroy a lab" when worker X is connected to a _different_ replica) is done via a Redis pub/sub relay (`vlab:worker-action:<workerId>`). Socket.IO rooms are similarly synced across replicas via `@socket.io/redis-streams-adapter`. See [manager.md](manager.md) for details.
- **Single deploy unit for Manager+Web.** `apps/web` is built by Vite directly into `out/manager/public`, and the Manager serves it as static assets with a SPA-fallback route. There's no separate frontend server in production.
- **Workers require elevated privileges.** Containerlab needs to manipulate kernel networking (namespaces, `rp_filter`, etc.), so the worker process needs to run as root/SUID-root/`clab_admins`-group, and in Docker Swarm deployments the worker container itself runs as a standalone `--privileged --pid host` container outside of Swarm's service model (see [manual.md](../../deployment/manual.md) and [docker-swarm.md](../../deployment/docker-swarm.md)).

## Core domain flow (a lab session, end to end)

1. An **instructor** authors a **Lab**: markdown instructions, a **Topology** (devices + links, drawn in the web topology editor), and a set of automated **Checks** with weights.
2. A **student** enrolls, then starts a **Lab Session**. The Manager picks an available **Worker** (capacity-aware scheduling — see [manager.md § worker selection](manager.md#worker-selection--scheduling)) and RPCs `clab:deployLab` to it.
3. The Worker generates a Containerlab topology file from the Lab's node/link definitions, runs `containerlab deploy`, and returns the deployed container IDs/IPs back to the Manager, which persists them as `lab_session_node` rows.
4. The Worker's health monitor (`@vlab/clab-monitor`) watches Docker events for every deployed container and streams `monitor:node-health` / `monitor:interface-update` events back to the Manager, which relays them to the browser over WebSocket in real time.
5. The Manager also asks the Worker to start an **evaluator** session (`@vlab/evaluator`) for the lab session — this continuously (event-driven, no polling) checks live device state (routes, interfaces, RouterOS config, etc.) against the Lab's check definitions and reports pass/fail transitions back as `evaluator:checkChanged` events.
6. The student can open an in-browser console to any deployed node via **Guacamole** (`guacd`), authenticated with a signed, time-limited connection token.
7. The session ends either by manual submission or by hitting its `dueDate` (a BullMQ delayed job auto-submits it). The Manager computes the final weighted score from the accumulated check results, tears down the containers (`clab:destroyLab`), and archives the session.

For the full glossary of these terms, see [domain/glossary.md](../domain/glossary.md).

## Where to go next

- New to the codebase? Read [manager.md](manager.md), [worker.md](worker.md), and [web.md](web.md) in that order.
- Working on Containerlab/health monitoring specifically? [clab.md](clab.md) and [clab-monitor.md](clab-monitor.md).
- Working on automated grading? [evaluator.md](evaluator.md).
- Need the wire protocol contracts? [protocols/](../protocols/).
- Need the DB schema? [domain/data-model.md](../domain/data-model.md).
- Working on course content (`docs/modules`)? [course-content.md](../course-content.md).
