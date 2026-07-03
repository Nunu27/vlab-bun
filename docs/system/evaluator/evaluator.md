# Lab Evaluation Engine

The evaluation engine automatically grades a student's lab session by checking whether the network has been configured according to the instructor's rules. It's push-driven end to end: checks re-evaluate the moment underlying state changes, not on a schedule.

## Core Package: `@vlab/evaluator`

All check definitions and the evaluation runtime live in `packages/@vlab/evaluator`, shared between the Manager (which stores rule *instances*) and the Worker (which actually runs the checks) so both sides agree on check ids and parameter shapes.

### How a check is defined

Each device kind is an `EvaluationHandler`, built with a fluent API (`base/evaluation-handler.ts`):

```
handler
  .kinds(["mikrotik_ros"])
  .withContext(buildContext, cleanupContext)   // e.g. open a RouterOS connection per node
  .addSource({ id, data: <TypeBox schema>, read, listen })
  .addCheck({ id, name, text, source, params: <TypeBox props>, handler })
```

A **source** is a per-node data feed (e.g. "the routing table", "the OSPF neighbor list") with both a `read()` (one-shot pull, used for the initial baseline evaluation) and a `listen()` (a live subscription — a `docker exec`'d `ip monitor route` process for Linux, a RouterOS API `.stream("/.../listen")` call for MikroTik). A **check** is a pure boolean function of a source's data plus instructor-supplied `params`.

`Evaluator.getChecks()` surfaces every registered check as a TypeBox schema (titled with its human-readable `text`) — this is what the Manager's admin UI uses to let instructors build grading rules without hardcoding check ids on the frontend.

### Registered handlers and their checks (current)

| Handler (kind) | Checks |
|---|---|
| `node-interface` (any node with a management interface map) | `check-ip` — interface has the expected IP address |
| `linux` | `route-exist` (destination + optional gateway match), `user-exist` |
| `mikrotik` (`mikrotik_ros`) | `route-exist` (with RouterOS route-flag matching), `ospf-instance-exist`, `ospf-area-exist`, `ospf-interface-template-exist`, `ospf-neighbor-exist`, `rip-instance-exist`, `rip-interface-template-exist`, `bgp-instance-exist`, `bgp-connection-exist`, `bgp-session-established`, `system-identity`, `user-exist` |

MikroTik has by far the richest check catalog since RouterOS exposes rich, streamable state over its own API; Linux checks are limited to what can be read via `docker exec` (routes, `/etc/passwd`).

## The Evaluation Flow

1. **Rule definition:** an instructor picks check types + params + weights when building a lab; these are stored in the `lab.checks` JSONB column as `{nodeId, checkId, params, weight}` entries (see [Data Model](../data-model/data-model.md#lab--instructor-authored-lab-templates)).
2. **Dispatch:** when a session starts, the Manager sends `evaluator:start` to the Worker over gRPC, with the session's node mapping and its check list.
3. **Session lifecycle** (`apps/worker/src/lib/evaluator.ts`): `startLabEvaluation` is idempotent per session — if a session is already being evaluated (e.g. a student briefly disconnected and reconnected), it just re-runs a baseline check instead of rebuilding everything. Otherwise it creates an `EvaluationSession`, starts every source actually referenced by at least one check (retrying indefinitely with exponential backoff — 500ms to 15s — if a source fails to start, not on a fixed schedule), and runs one initial `check()` pass.
4. **Live re-evaluation:** each source's `listen()` callback fires on change and re-evaluates only the checks bound to that source — a routing-table change doesn't re-run OSPF checks. The `node-interface` source is fed directly from `@vlab/clab-monitor`'s live interface map (see [Containerlab Integration](../containerlab/containerlab.md#telemetry-monitoring-vlabclab-monitor)) rather than doing its own read.
5. **Reporting:** every check-state transition is pushed back to the Manager immediately as a `checkChanged` reply event on the same `evaluator:start` RPC — not polled, not batched.
6. **Persisting and scoring:** the Manager writes each transition into `lab_session_check` and broadcasts it to the browser over WebSocket (`lab-session:[sessionId]:checks`). The final score is computed once, at submission, by summing `weight` for completed checks over total `weight` across the lab's `checks` map — **scoring itself is Manager-side**; the Worker only ever reports booleans.
7. **Teardown:** `evaluator:stop` supports both `immediate: true` (lab is being destroyed) and a debounced 30-second delayed stop (a brief disconnect/reconnect doesn't tear down and rebuild all sources).

## Execution Mechanics per Device Kind

- **Linux:** no persistent connection object — checks run via `dockerode`'s `container.exec` (`ip -j route`, `cat /etc/passwd`), with live updates from long-running exec'd processes (`ip -o monitor route`, `inotifywait` on `/etc/passwd`).
- **MikroTik:** a `mikro-routeros` `RouterOSClient` connects to the container's RouterOS API (port 8728) once per node, using credentials read from its `USERNAME`/`PASSWORD` env vars. Live updates come from genuine RouterOS API `.stream("/.../listen")` subscriptions, not client-side polling — see [External Libraries](../external-libs/external-libs.md).

Per-node contexts (a RouterOS connection, a cached exec handle) are reused across checks and torn down/rebuilt after 3 consecutive failures, so a dead connection self-heals on the next access rather than needing a restart.
