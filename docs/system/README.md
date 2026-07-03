# vLab System Documentation

Internal system documentation for vLab, meant to get a new developer to a working mental model of the monorepo quickly.

## Getting Started

Read in this order:

1. **[Codebase Tour](./codebase-tour/codebase-tour.md)**
   Start here. What `apps/manager`, `apps/worker`, `apps/web`, and each `packages/*` module actually does.

2. **[System Architecture](./architecture/architecture.md)**
   Why the Manager-Worker split exists, how Worker selection works, and the full lifecycle of a lab session, from "Start Lab" to teardown.

3. **[Communication Protocols](./communication/communication.md)**
   The Waycast RPC framework that underlies both the Manager<->Worker gRPC tunnel and the Manager<->Browser WebSocket channel — msgpack codec, standard-schema validation, and the session take-over race fix.

4. **[Data Model & Database](./data-model/data-model.md)**
   PostgreSQL via Drizzle ORM: users/labs/sessions, the JSONB-encoded topology and grading rules, and the Worker capacity/cost model.

5. **[Frontend Architecture](./frontend/frontend.md)**
   The React 19 web app: TanStack Router/Query, Zustand, the typed Eden-Treaty API client, and the real-time WebSocket hooks.

## Core Engines

- **[Containerlab Integration](./containerlab/containerlab.md)** — how vLab builds topologies, invokes the Containerlab CLI, hardens lab nodes, and monitors container lifecycle/health/interfaces.
- **[Lab Evaluation Engine](./evaluator/evaluator.md)** — the push-driven check/scoring engine that grades a student's lab session.

## Additional References

- **[External Libraries](./external-libs/external-libs.md)** — vendored forks (Mikro-RouterOS) and first-party dependencies worth knowing about (Waycast).

---
*Diagrams are stored as `.excalidraw` files, viewable/editable in VS Code via the [Excalidraw extension](https://marketplace.visualstudio.com/items?itemName=pomdtr.excalidraw-editor).*
