---
id: "grpc-connection-logging-worker-2026-06-12"
status: "done"
priority: "low"
assignee: null
dueDate: null
created: "2026-06-11T18:24:31.000Z"
modified: "2026-06-11T18:24:31.000Z"
completedAt: "2026-06-11T18:24:31.000Z"
labels: ["worker", "observability"]
order: "b0"
---

# gRPC Connection Logging for Worker

Replaced standard `console.log` calls with unified Pino logger for the gRPC connection states.

## Acceptance Criteria
- [x] Initialized dedicated `pino` logger (`name: "worker"`) at application entry.
- [x] Initialized dedicated `pino` logger (`name: "grpc"`) for gRPC service logic.
- [x] Log when attempting to connect to Manager gRPC server.
- [x] Log successful connection and stream establishment.
- [x] Log disconnection, stream drops, and retry loops.
- [x] Convert unhandled rejection/exception console errors to proper Pino logger errors.
