# vLab System Documentation

This is the developer-facing system reference for vLab: a virtual networking-lab platform that orchestrates [Containerlab](https://containerlab.dev/)-based network topologies for hands-on student exercises, built around a Manager–Worker architecture.

**Start here**: [architecture/overview.md](architecture/overview.md) — the big picture (why the system is shaped the way it is, the core lab-session flow end to end).

If you just need deployment instructions (not architecture), see [`../deployment/`](../deployment/index.md) instead. If you're editing student-facing lab curriculum, see [course-content.md](course-content.md).

## Architecture (`architecture/`)

| Doc                                                   | Covers                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| [overview.md](architecture/overview.md)               | System context, why it's shaped this way, the end-to-end lab-session flow      |
| [manager.md](architecture/manager.md)                 | `apps/manager` — HTTP/gRPC/WS composition, auth, DB, queues, Guacamole         |
| [worker.md](architecture/worker.md)                   | `apps/worker` — daemon bootstrap, gRPC client, lab lifecycle domain logic      |
| [clab.md](architecture/clab.md)                       | `@vlab/clab` — Containerlab CLI wrapper (deploy/destroy/inspect)               |
| [clab-monitor.md](architecture/clab-monitor.md)       | `@vlab/clab-monitor` — Docker event → health/interface state engine, auto-heal |
| [evaluator.md](architecture/evaluator.md)             | `@vlab/evaluator` — automated grading engine, self-healing design              |
| [web.md](architecture/web.md)                         | `apps/web` — routing, state, data fetching, realtime, topology editor          |
| [shared-packages.md](architecture/shared-packages.md) | `@vlab/shared`, `@vlab/grpc`, `@vlab/ws`, `@jawit/*`, `mikro-routeros`         |

## Protocols (`protocols/`)

| Doc                                                        | Covers                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------- |
| [grpc-manager-worker.md](protocols/grpc-manager-worker.md) | Manager↔Worker wire protocol: proto + Waycast command catalog |
| [websocket-waycast.md](protocols/websocket-waycast.md)     | Manager↔Web wire protocol: Socket.IO + Waycast route catalog  |

## Domain (`domain/`)

| Doc                                   | Covers                                                   |
| ------------------------------------- | -------------------------------------------------------- |
| [data-model.md](domain/data-model.md) | Postgres/Drizzle schema — tables, columns, relationships |
| [glossary.md](domain/glossary.md)     | Plain-English definitions of every domain concept        |

## Other

| Doc                                    | Covers                                                              |
| -------------------------------------- | ------------------------------------------------------------------- |
| [course-content.md](course-content.md) | `docs/modules/*` structure, how it's seeded and evaluated           |
| [testing-ci.md](testing-ci.md)         | `tests/evaluator-e2e`, `tests/modules-e2e`, GitHub Actions pipeline |

## Diagrams (`diagrams/`, Mermaid `.mmd`)

| File                                                                | Shows                                                                    |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [system-context.mmd](diagrams/system-context.mmd)                   | Full system context: web, manager, workers, Postgres, Redis, S3, guacd   |
| [manager-worker-sequence.mmd](diagrams/manager-worker-sequence.mmd) | Worker connect handshake + full deploy-lab sequence                      |
| [lab-session-lifecycle.mmd](diagrams/lab-session-lifecycle.mmd)     | Lab session state diagram (init → active → submit/expire → destroy)      |
| [node-health-state.mmd](diagrams/node-health-state.mmd)             | Node health state machine + auto-heal sub-states                         |
| [auth-flow.mmd](diagrams/auth-flow.mmd)                             | CAS SSO vs. password login sequence, plus per-request session validation |
| [er-diagram.mmd](diagrams/er-diagram.mmd)                           | Entity-relationship diagram of the full Drizzle schema                   |

Render `.mmd` files with the [Mermaid Live Editor](https://mermaid.live/), a Markdown preview extension with Mermaid support, or `mmdc` (`@mermaid-js/mermaid-cli`).

## Known rough edges worth knowing about

Called out in more detail in their respective docs, but worth surfacing here so they aren't missed:

- **Duplicated `NodeHealth` enum** — the same health-state union is independently defined in `@vlab/clab-monitor`, `@vlab/shared`, `@vlab/grpc`, and `@vlab/ws`, kept in sync by convention/comments rather than a shared import. See [shared-packages.md](architecture/shared-packages.md#packagesvlabshared--cross-app-types-enums-schemas-utils).

Note: auto-heal (`containerlab restart --node`) does **not** cause container-ID drift — it's an in-place Docker restart of the same container, not a recreate, so `lab_session_node.id` stays valid across a heal cycle. See [clab-monitor.md § Auto-heal](architecture/clab-monitor.md#auto-heal-appsworkersrcservicesmonitorhealt).
