# System Architecture

This document provides a deep dive into the vLab system architecture. It explains **why** the system is built the way it is and describes the high-level orchestration flow.

vLab utilizes a distributed, **Manager-Worker** architecture. This design was chosen specifically to orchestrate Containerlab topologies on remote, bare-metal or virtual machine hosts securely and efficiently, while maintaining a centralized source of truth.

*(Please refer to the `architecture-overview.excalidraw` diagram in this directory for a high-level view of component interactions).*

---

## 1. The Manager (`apps/manager`)

The Manager is the "brain" of the vLab system. It is a centralized Elysia.js API server that maintains the database (PostgreSQL) and exposes endpoints to the Web UI.

**Why centralize?**
- **Single Source of Truth:** Only the Manager connects to the PostgreSQL database. Workers do not need database credentials, reducing the attack surface.
- **State Coordination:** The Manager tracks which Worker is running which lab session, ensuring no port conflicts or resource overallocation occurs across the cluster.
- **User Management:** All authentication and authorization are handled centrally before any action is passed to a Worker.

## 2. The Worker (`apps/worker`)

The Worker is a long-running daemon installed directly on the host machines where the lab simulations will actually run. 

**Why use a Worker daemon?**
- **Root/Docker Access:** Containerlab requires root privileges and Docker socket access to create network namespaces and containers. By using a Worker, the Manager does not need SSH or direct Docker API access to the host machines. The Worker safely executes these privileged commands locally.
- **Telemetry Streaming:** The Worker monitors container lifecycle events, health status, and network interfaces using Docker events, while simultaneously streaming host-level system metrics (CPU, Memory, Storage) back to the Manager in real-time.

## 3. The Web UI (`apps/web`)

The Web UI is a React 19 application. It is a purely presentation layer that communicates exclusively with the Manager. It never communicates directly with a Worker.

---

## Orchestration Lifecycle

To understand how these components interact, let's look at the lifecycle of a typical Lab Provisioning event:

*(Please refer to the `lab-lifecycle.excalidraw` diagram in this directory for a sequence diagram of the provisioning process).*

1. **Request:** A user clicks "Start Lab" in the Web UI. An HTTP request is sent to the Manager.
2. **Validation:** The Manager validates the user's session, ensures they are authorized to run the lab, and generates a Session ID in the database.
3. **Dispatch:** The Manager looks up the appropriate Worker node and sends an orchestration command via **gRPC**. It transmits the parsed lab configuration (nodes, links, assets).
4. **Execution:** The Worker receives the gRPC command, generates the Containerlab YAML topology, writes it to disk, and invokes the `containerlab deploy` CLI command.
5. **Telemetry:** Once deployed, the Worker begins streaming container telemetry and logs back to the Manager via **gRPC**.
6. **Delivery:** The Manager proxies this telemetry stream directly to the Web UI via **WebSockets/Waycast** so the user can see their lab booting up in real-time.

For more details on exactly how the Manager and Worker talk to each other, see the [Communication Protocols](../communication/communication.md) documentation.
