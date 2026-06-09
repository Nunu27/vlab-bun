# 06 - Architecture Split: Manager & Worker

The vLab architecture is evolving from a monolithic backend (`@vlab/api`) into a distributed, two-service model consisting of a **Manager** and a **Worker**. This separation isolates external-facing traffic and coordination logic from the heavy, system-level execution required to orchestrate Containerlab and Docker.

## The Need for a Split

In the monolithic design, a single API server handled everything:
- Serving the REST API.
- Maintaining student WebSocket connections.
- Proxying remote desktop protocols via Guacamole.
- Interacting directly with the local Docker daemon to orchestrate Containerlab.
- Running the real-time Evaluator Engine by polling or listening to Docker events.

This design tightly coupled web traffic and authentication with low-level infrastructure execution, limiting scalability and requiring the primary API to run with elevated Docker privileges. 

## 1. The Manager Service (`apps/manager`)

The **Manager** acts as the central brain and the primary entry point for all frontend client interactions. 

### Responsibilities:
- **REST API**: Handles all HTTP requests for labs, authentication, users, and administrative CRUD operations. Interacts directly with the PostgreSQL database (via Drizzle ORM).
- **WebSocket Gateway (WS)**: Maintains real-time connections with student clients, broadcasting state updates and evaluation results.
- **Guacamole-Lite Proxy**: Continues to provide the tokenized remote desktop and terminal bridging for browser-to-node access.
- **gRPC Server**: Exposes a strict gRPC interface that Worker nodes connect to. It receives event streams from Workers and dispatches commands (e.g., "Deploy Lab Session X").

*Note: The Manager no longer needs direct access to the Docker daemon or Containerlab binaries.*

## 2. The Worker Service (`apps/worker`)

The **Worker** is the dedicated execution node responsible for the heavy lifting. It is designed to be deployed directly on the host machines where the virtualized topologies will run.

### Responsibilities:
- **gRPC Client**: Connects to the Manager's gRPC server to receive commands and stream back results.
- **Containerlab Orchestration**: Receives topology blueprints from the Manager, generates the `.clab.yml` definitions, and executes `containerlab` CLI commands (`deploy`, `destroy`) natively on the host.
- **Local Monitoring & Evaluation**: Runs `@vlab/clab-monitor` to tap directly into the local Docker daemon's event stream. Runs `@vlab/evaluator` checks locally against the Docker daemon to grade student topologies automatically.
- **State Streaming**: Pushes real-time updates (interface changes, node health, evaluation successes) back up to the Manager via the gRPC stream.

## gRPC Communication Flow

The strict boundary between Manager and Worker is defined by **Protobuf contracts**.

1. **Deployment**: When a student starts a session, the Manager sends a `DeployLab` gRPC command to the Worker, containing the parsed topology data.
2. **Execution**: The Worker executes Containerlab, spinning up the Docker containers on its host.
3. **Event Streaming**: As containers boot and interfaces come online, the Worker's local Monitor catches the Docker events and streams them to the Manager via a gRPC bidirectional stream.
4. **Broadcasting**: The Manager receives the stream and translates it into WebSocket messages, pushing the updates to the student's browser UI.

By isolating the Worker, vLab can horizontally scale execution nodes across multiple servers, while keeping the centralized Manager lightweight and secure.
