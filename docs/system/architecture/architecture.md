# System Architecture

This document explains **why** vLab is built the way it is, and walks through how its components interact at runtime.

vLab uses a distributed **Manager-Worker** architecture, chosen to orchestrate Containerlab topologies on remote bare-metal or VM hosts securely, while keeping a single centralized source of truth.

*(See `architecture-overview.excalidraw` and `lab-lifecycle.excalidraw` in this directory for diagrams — they still reflect the current shape of the system.)*

---

## 1. The Manager (`apps/manager`)

The Manager is an Elysia.js API server (running on Bun) and is the only component that connects to PostgreSQL. It also depends on **Redis** (sessions, pub/sub, and as the BullMQ backing store) and **RustFS** (S3-compatible object storage for lab attachments/covers/embedded files).

**Why centralize?**
- **Single source of truth:** only the Manager holds DB credentials. Workers never touch PostgreSQL.
- **State coordination:** the Manager tracks which Worker runs which lab session so it can pick a Worker with headroom and avoid port/resource conflicts.
- **Background task processing:** BullMQ (backed by Redis) runs the delayed per-session auto-submit job, the hourly orphan-file cleanup job, and the disconnect-grace-period scheduler for the WebSocket layer — all exactly-once regardless of how many Manager replicas are running.
- **Auth:** all authentication (CAS SSO for students, password login for admin/instructor) is handled centrally before anything reaches a Worker.
- **Remote access proxy (Guacamole):** the Manager proxies SSH/VNC/RDP/Telnet terminal sessions into lab containers via `guacamole-lite`, so the browser never learns a Worker's real IP. Guacamole session state is stored in Redis (24h TTL) rather than in-process, so any Manager instance can resume a proxied session.

**Horizontal scaling.** The Manager is designed to run as multiple replicas. A Worker's gRPC stream is only attached to *one* Manager instance at a time, but an HTTP/WS request can land on any instance. To dispatch an action to a Worker connected elsewhere, the owning-instance check happens first (`connectedWorkers.has(workerId)`); if the Worker isn't local, the action is msgpack-encoded and published to a Redis channel (`vlab:worker-action:<workerId>`) for the instance that does own the connection to pick up and execute.

## 2. The Worker (`apps/worker`)

The Worker is a daemon installed directly on each host machine where labs actually run.

**Why a separate daemon?**
- **Root/Docker access:** Containerlab needs root privileges and Docker socket access to create network namespaces and containers. The Worker holds that privilege locally; the Manager never gets SSH or Docker API access to host machines.
- **Telemetry:** the Worker watches Docker events for container lifecycle/health and interface changes (via `@vlab/clab-monitor`, fully event-driven — see [Containerlab Integration](../containerlab/containerlab.md)) and separately reports host-level CPU/memory/storage usage.

Host-level metrics are currently sent on a **fixed 10-second timer** (`apps/worker/src/services/worker.ts`, a plain `setTimeout` loop calling a unary `sendMetrics` RPC) — this is the one polling loop left in the system; container-level telemetry (health, interfaces, evaluation checks) is push/event-driven end to end.

Everything the Worker exposes to the Manager — deploy/destroy/reconcile a lab, pull an image, measure container stats, start/stop evaluation — is an RPC tunneled inside a single long-lived gRPC stream. See [Communication Protocols](../communication/communication.md).

## 3. The Web UI (`apps/web`)

A React 19 SPA. Purely a presentation layer: it talks to the Manager over HTTP (via a typed Eden-Treaty + TanStack Query client) and over WebSocket (via Waycast), and never talks to a Worker directly.

---

## 4. Worker Selection

When a lab session is started, the Manager picks a Worker using a **health-gated least-connections** algorithm (`apps/manager/src/services/grpc/handlers/worker.ts`, `tryGetAvailableWorkerId`):

```sql
SELECT id FROM workers
WHERE status = 'online'
  AND (1 - cpu_usage_percent / 100.0) * cpu_cores    >= :labCpuCost
  AND (1 - memory_usage_percent / 100.0) * memory_mb >= :labMemoryCost
ORDER BY active_labs ASC
LIMIT 1
FOR UPDATE SKIP LOCKED
```

1. **Admission control:** only `online` Workers with enough *absolute* free CPU and memory headroom are eligible. Using absolute headroom (rather than a flat percentage threshold) keeps the gate fair across Workers with different hardware — a small and a large Worker at the same usage percentage have very different real headroom.
2. **Least connections:** among eligible Workers, the one with the fewest active lab sessions (`activeLabs`) wins.
3. **Atomic selection:** the select and the `activeLabs` increment happen in one transaction with `FOR UPDATE SKIP LOCKED`, so concurrent requests can't race onto the same Worker based on a stale read.

If no Worker is available, `waitForAvailableWorkerId()` retries with exponential backoff (500ms initial, 5s cap, 30s total timeout) rather than failing immediately, surfacing an `onWait` callback the UI uses to show a "high demand" toast on the first retry.

The `activeLabs` counter is owned entirely by the Manager: incremented atomically at selection, decremented when a session ends or a deployment fails, and reset to `0` whenever a Worker disconnects.

### Lab Cost Estimation

`labCpuCost`/`labMemoryCost` are the sum of each device template's `cpuCostCores`/`memoryCostMB` across the lab's topology, falling back to `DEFAULT_CPU_COST_CORES = 0.5` cores / `DEFAULT_MEMORY_COST_MB = 512` MB per device when a template hasn't been measured yet.

These cost fields are populated by the admin **Test Connection** flow: it boots the device template's image on a Worker, waits for CPU to settle, reads Docker's stats API (`docker:measureContainerStats` RPC, one-shot — not a stream), and streams the measured values back as a `stats` reply. The admin can then click **Apply to cost fields** to write them into the template before saving.

*(Note: the `workers` table used to carry its own CPU/memory threshold columns for admission control; those were removed in favor of the per-device-template cost model above — Workers now only report live usage percentages and raw capacity, all the placement math is per-lab-request.)*

---

## Orchestration Lifecycle

*(See `lab-lifecycle.excalidraw` in this directory for the sequence diagram.)*

1. **Request:** a student opens a lab and the frontend sends `lab:[id]:init` over the Waycast WebSocket connection to the Manager.
2. **Worker selection:** the Manager validates the session, picks a Worker (see above), and creates the `lab_session` row.
3. **Dispatch:** the Manager sends a `clab:deployLab` RPC to the chosen Worker over gRPC, carrying the resolved topology (nodes, links, credentials, per-node resource overrides).
4. **Execution:** the Worker builds a `ContainerlabTopologyDefinition` in memory (injecting security-hardening execs and management routes), writes it as YAML, and runs `containerlab deploy`.
5. **Telemetry:** once deployed, `@vlab/clab-monitor` starts watching the new containers; health/interface updates and evaluator check results stream back to the Manager over the same gRPC connection as they happen.
6. **Delivery:** the Manager relays that stream to the browser over the Waycast WebSocket connection (`node:[id]:health`, `node:[id]:interfaces:[interface]`, `lab-session:[sessionId]:checks`), so the UI updates live as the lab boots and as the student configures it.
7. **Teardown:** either the student submits, the session's duration elapses (BullMQ `lab-session` cleanup job), or the Manager loses the Worker connection (reconciled via `clab:reconcileSessions` on reconnect) — in each case `clab:destroyLab` tears the topology down and the evaluation session is stopped.

For the full protocol details — the gRPC tunnel, the Waycast RPC framework, msgpack, and the session take-over fix — see [Communication Protocols](../communication/communication.md).
