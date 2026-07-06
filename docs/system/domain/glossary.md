# Domain Glossary

Plain-English definitions of vLab's core concepts. For the underlying tables, see [data-model.md](data-model.md); for the deployed-container mechanics, see [../architecture/worker.md](../architecture/worker.md) and [../architecture/clab.md](../architecture/clab.md).

**Lab**
An authored exercise: markdown `content`/`instructions`, a `topology` (devices/edges/groups/notes graph, JSON, drawn in the web topology editor), `checks` (automated grading rubric with per-check `weight`), a publish window (`startAt`/`endAt`), `maxAttempt`, and `sessionDuration`. Owned by an `instructor`.

**Lab Session**
One student's live or completed attempt at a Lab: bound to exactly one Worker, has a `dueDate` (auto-submit deadline), a `score`, and `submittedAt` (null while in progress). Created by the `lab:[id]:init` WS RPC, backed by `clab:deployLab` on the worker.

**Lab Session Node**
One deployed Containerlab container within a session, tracked with live `health`, `interfaces` (IP info, debounced from worker events), and a Guacamole `token` for console access. Its `id` is the literal Docker container ID.

**Device Template**
A reusable node blueprint (image, Containerlab `kind`, resource/connection/interface defaults, env vars) grouped by Device Category. This is the catalog instructors pick from when building a topology.

**Topology Template**
A reusable canned topology graph (devices + links + groups + notes), independent of any specific Lab — a starting point for the topology editor.

**Worker**
A Containerlab-hosting daemon (`apps/worker`, a separate long-running process, typically one per host machine) that streams gRPC commands/events with the Manager; tracked with live capacity (cpu/mem/storage) and load (`activeLabs`/`activeNodes`/`deployingLab`) for scheduling. See [architecture/worker.md](../architecture/worker.md).

**Node Health**
The lifecycle state of one deployed container, as tracked by `@vlab/clab-monitor`: `starting → healthy ⇄ unhealthy → died/destroyed`. See [architecture/clab-monitor.md § Health state machine](../architecture/clab-monitor.md#health-state-machine). This same union is duplicated (by convention, not shared import) across `@vlab/clab-monitor`, `@vlab/shared`, `@vlab/grpc`, and `@vlab/ws`.

**Auto-heal**
A worker-side background process that automatically restarts (`containerlab restart --node`) a node that goes `unhealthy`, with jittered scheduling and capped retries. See [architecture/clab-monitor.md § Auto-heal](../architecture/clab-monitor.md#auto-heal-appsworkersrcservicesmonitorhealt).

**Evaluator / Check**
A pluggable automated grading unit (from `@vlab/evaluator`) run on the worker against a live node — e.g. "does this route exist", "is this OSPF neighbor up". Reported back as `evaluator:checkChanged` events. See [architecture/evaluator.md](../architecture/evaluator.md).

**User / Student / Instructor / Admin**
Role-based identity; `student` and `instructor` are 1:1 extension tables of `user` (student has NRP/degree/year/study-program; instructor has NIP). `admin` has no extension table.

**Study Program / Department**
Academic organizational hierarchy used to auto-assign students via CAS NRP parsing at first login.

**File**
A content-hash-addressed, S3/MinIO-backed upload (cover images, attachments, embedded markdown images), garbage-collected hourly when unreferenced.

**Waycast**
A custom typed RPC/pub-sub framework (not a public npm ecosystem standard — internal to this repo's dependency graph) used to multiplex request/response and fire-and-forget event traffic over a single underlying transport. Used twice, structurally identically, over two different transports:
- Manager ↔ Worker, tunneled over one gRPC bidirectional stream (`@vlab/grpc`, see [protocols/grpc-manager-worker.md](../protocols/grpc-manager-worker.md)).
- Manager ↔ Web, over Socket.IO (`@vlab/ws`, see [protocols/websocket-waycast.md](../protocols/websocket-waycast.md)).

**Guacamole / guacd**
[Apache Guacamole](https://guacamole.apache.org/)'s daemon (`guacd`), embedded via `guacamole-lite` on the manager, brokers in-browser RDP/VNC/SSH/Telnet console access to lab devices using signed, time-limited connection tokens — no client software needed on the student's machine.

**CAS**
Central Authentication Service — the institution's SSO system. Students log in via CAS; on first login, a `student` account is auto-provisioned from CAS attributes (NRP parsed to derive year/degree level/study program).

**NRP**
Student registration number (institution-specific student ID format), parsed by `apps/manager/src/utils/nrp.ts` at CAS auto-provisioning time to derive a student's enrollment year and degree level.
