# Communication Protocols

vLab relies on high-performance, real-time communication protocols to maintain synchronization across its distributed architecture. There are three primary modes of communication: HTTP APIs, gRPC, and WebSockets (via Waycast).

*(Please refer to the `communication-flow.excalidraw` diagram in this directory for a visual representation of the Manager acting as a hub between the Web UI and the Worker).*

---

## 1. Manager ↔ Worker Communication

The Manager and Worker interact securely over two distinct channels, each chosen for specific performance characteristics.

### gRPC (Command & Control)
For robust, strongly-typed internal Remote Procedure Calls (RPCs) between the Manager and Worker daemons, vLab utilizes **gRPC**.

- **Why gRPC?** Orchestration commands (like "deploy this lab" or "destroy this topology") must be guaranteed to deliver and require strict schema typing to prevent critical failures on the host machine.
- **Package:** `packages/@vlab/grpc` contains the protobuf definitions and generated clients.
- **Usage:** The Manager hosts the gRPC server. The Worker connects as a client and establishes a bidirectional stream (`listenCommand`). Logically, the Worker acts as a command processor (handled in `apps/worker/src/handlers/`) to receive and execute instructions pushed by the Manager over this stream.

### gRPC Streams (Telemetry)
While gRPC is excellent for unary request/response orchestration, it also supports efficient bidirectional streaming. vLab leverages this capability to stream real-time telemetry (such as host-level resource usage and container lifecycle events) back to the Manager.

- **Why gRPC Streams?** Reusing the existing gRPC connection for telemetry eliminates the need to manage a separate WebSocket transport layer, simplifying the Worker's architecture and securing all communication behind a single protocol.
- **Package:** `packages/@vlab/grpc`
- **Usage:** Once a lab is provisioned via gRPC, the Worker streams real-time logs and telemetry data back to the Manager over long-lived gRPC streams.

---

## 2. Manager ↔ Web UI Communication

The Web UI never communicates directly with a Worker. All data passes through the Manager API.

### HTTP REST API (Elysia.js)
Standard operations—such as user login, fetching the list of available lab templates, and viewing historical session scores—are handled via standard HTTP endpoints.

- **Usage:** The Manager exposes these endpoints using Elysia.js. The Web UI consumes them using TanStack Query, allowing for efficient caching and background invalidation.

### WebSockets & Waycast (Real-time UI)
Just as the Worker streams telemetry to the Manager, the Manager proxies that telemetry down to the Web UI using the exact same Waycast protocol.

- **Usage:** When a user opens a running lab session in the Web UI, their browser establishes a WebSocket connection to the Manager. The Manager multiplexes the telemetry stream arriving from the Worker and broadcasts it to the appropriate authenticated web clients.

### WebSockets (Guacamole Remote Access)
Terminal access (SSH, VNC, RDP) to the individual nodes in a lab is also handled via WebSockets, completely separate from the Waycast telemetry stream.

- **Usage:** The Web UI utilizes a Guacamole client that connects to the Manager via a dedicated WebSocket connection. The Manager (`apps/manager/src/services/guacamole-lite/`) validates the connection token and proxies the raw remote desktop protocol frames back and forth to the `guacd` daemon, keeping the actual Worker IP hidden.
