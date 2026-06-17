# System Architecture

This document provides a deep dive into the vLab system architecture. It explains **why** the system is built the way it is and describes the high-level orchestration flow.

vLab utilizes a distributed, **Manager-Worker** architecture. This design was chosen specifically to orchestrate Containerlab topologies on remote, bare-metal or virtual machine hosts securely and efficiently, while maintaining a centralized source of truth.

*(Please refer to the `architecture-overview.excalidraw` diagram in this directory for a high-level view of component interactions).*

---

## 1. The Manager (`apps/manager`)

The Manager is the "brain" of the vLab system. It is a centralized Elysia.js API server that maintains the database (PostgreSQL) and exposes endpoints to the Web UI. It also utilizes **Redis** and **BullMQ** for managing background tasks and enabling horizontal scalability.

**Why centralize?**
- **Single Source of Truth:** Only the Manager connects to the PostgreSQL database. Workers do not need database credentials, reducing the attack surface.
- **State Coordination:** The Manager tracks which Worker is running which lab session, ensuring no port conflicts or resource overallocation occurs across the cluster.
- **Background Task Processing:** Heavy or scheduled tasks (such as Lab Session auto-expiration or File Storage Garbage Collection) are managed cluster-wide via BullMQ, guaranteeing they execute reliably and exactly once regardless of how many Manager replicas are running.
- **User Management:** All authentication and authorization are handled centrally before any action is passed to a Worker.
- **Remote Access Proxy (Guacamole):** The Manager acts as a secure proxy for student terminal connections (SSH, VNC, RDP, Telnet) into lab containers using `guacamole-lite`, hiding the Worker's direct IP from the end-user.

## 2. The Worker (`apps/worker`)

The Worker is a long-running daemon installed directly on the host machines where the lab simulations will actually run. 

**Why use a Worker daemon?**
- **Root/Docker Access:** Containerlab requires root privileges and Docker socket access to create network namespaces and containers. By using a Worker, the Manager does not need SSH or direct Docker API access to the host machines. The Worker safely executes these privileged commands locally.
- **Telemetry Streaming:** The Worker monitors container lifecycle events, health status, and network interfaces using Docker events, while simultaneously streaming host-level system metrics (CPU, Memory, Storage) back to the Manager in real-time.

## 3. The Web UI (`apps/web`)

The Web UI is a React 19 application. It is a purely presentation layer that communicates exclusively with the Manager. It never communicates directly with a Worker.

---

## 4. Worker Selection & Scoring

When a user starts a lab, the Manager must choose which Worker to dispatch it to. It does this by picking the online Worker with the **highest score** (`ORDER BY score DESC`).

Each Worker computes and streams its own score every 10 seconds from `apps/worker/src/services/worker.ts`. The score is a number from 0 to 100, where 100 means completely idle and 0 means fully saturated or critically loaded.

### Formula

```
score = 100
      − (cpu%  / 100)²  × 30 × cpuScale
      − (mem%  / 100)²  × 45 × memScale
      − (disk% / 100)²  × 10
      − (activeLabs / 10)² × 15
```

**Inputs:**

| Variable | Source | Notes |
|---|---|---|
| `cpu%` | Live CPU usage | Sampled on the Worker host |
| `mem%` | Live RAM usage | Sampled on the Worker host |
| `disk%` | Live disk usage | Mounted root filesystem |
| `activeLabs` | containerlab monitor | Running lab sessions on this Worker |

**Weights** (`cpu=0.30, mem=0.45, disk=0.10, labs=0.15`) reflect that RAM is typically the binding constraint for containerlab topologies, while active lab count is the most direct load signal.

The quadratic curve (`x²`) intentionally penalizes high utilization more aggressively than low: going from 80% → 90% hurts the score much more than 10% → 20%.

### Capacity-Aware Scaling

The `cpuScale` and `memScale` factors correct for the fact that two Workers at the same usage percentage may have very different absolute headroom:

```
memScale = clamp(16 / totalMemGB,  0.5, 2.0)
cpuScale = clamp(8  / totalCores,  0.5, 2.0)
```

**Reference baseline:** 16 GB RAM, 8 CPU cores.

- A **smaller** Worker (e.g. 8 GB) gets `memScale = 2.0` — its memory penalty is doubled, so it fills up faster in the ranking.
- A **larger** Worker (e.g. 32 GB) gets `memScale = 0.5` — its memory penalty is halved, reflecting genuine headroom.
- The factor is clamped to `[0.5, 2.0]` so neither very large nor very small machines are treated unrealistically.

### Hard Cliffs

On top of the quadratic base, two independent hard penalties are applied:

| Condition | Penalty |
|---|---|
| `mem% > 90` | −30 pts |
| `disk% > 85` | −30 pts |

These fire independently, so a Worker critical on both resources takes −60. The disk threshold is intentionally set at 85% (not 90%) because containerlab image pulls can fail before the disk is completely full.

The final score is clamped to `[0, 100]`.

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
