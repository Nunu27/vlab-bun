# Data Model (Postgres / Drizzle Schema)

Source: `apps/manager/src/db/schema/*.ts` (re-exported from `schema/index.ts`). All tables spread a shared `base` (`schema/base.ts`): `id: uuid` (default `Bun.randomUUIDv7()`), `createdAt`, `updatedAt`. Casing convention is `snake_case` in Postgres, camelCase in TS (Drizzle's `casing: "snake_case"` option).

See also: [`../diagrams/er-diagram.mmd`](../diagrams/er-diagram.mmd) for the visual entity-relationship diagram, and [`glossary.md`](glossary.md) for plain-English definitions of these concepts.

## `auth.ts` — identity & academic organization

| Table           | Key columns                                                                                                    | Relationships                     |
| --------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `department`    | `name`                                                                                                         | —                                 |
| `study_program` | `name`                                                                                                         | → `department`                    |
| `user`          | `name`, `email`, `passwordHash` (nullable — null for CAS-only accounts), `role` (`student\|instructor\|admin`) | base identity for all three roles |
| `student`       | PK = `user.id`; `nrp`, `year`, `degreeLevel` (`D3\|LJ\|D4\|S2`)                                                | → `study_program`                 |
| `instructor`    | PK = `user.id`; `nip`                                                                                          | —                                 |

`student` and `instructor` are 1:1 extension tables of `user` (shared PK), not separate identities — a row only ever exists in one of them for a given `user.id`.

## `lab.ts` — lab authoring

| Table               | Key columns                                                                                                                                                                                                                            | Relationships                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `lab`               | `name`, cover image, `content`/`instructions` (markdown), `topology` (jsonb `LabTopology`), `checks` (jsonb `LabChecksMap`), `maxAttempt`, `sessionDuration` (minutes, default 180), `startAt`/`endAt` (publish window), `isPublished` | → `instructor` (owner)                                                                                                        |
| `lab_attachments`   | `name`, `file`                                                                                                                                                                                                                         | → `lab`; unique on `(labId, file)`                                                                                            |
| `lab_embedded_file` | composite PK `(labId, file)`                                                                                                                                                                                                           | files referenced inline in `content`/`instructions` markdown, tracked separately from attachments for orphan-cleanup purposes |
| `lab_enrollment`    | composite PK `(labId, studentId)`                                                                                                                                                                                                      | which students may attempt a lab                                                                                              |

## `lab-session.ts` — live/completed attempts

| Table               | Key columns                                                                                                                                                                                                  | Relationships                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| `lab_session`       | `clientId` (`"<wsConnectionId>:<requestId>"` owner lock), `score` (numeric, default 0), `submittedAt` (nullable = in-progress), `dueDate`                                                                    | → `lab`, → `student`, → `worker`             |
| `lab_session_check` | composite PK `(labSessionId, checkId)`; `completed` (boolean)                                                                                                                                                | per-check pass/fail state from the evaluator |
| `lab_session_node`  | PK = worker-assigned container id **string** (not a UUID — see note below); `health` (enum), `ip`, `interfaces` (jsonb map), `labNodeId` (= topology node UUID), `token` (signed Guacamole connection token) | → `lab_session`, → `device_template`         |

> **`lab_session_node.id` is the literal Docker container ID string** returned by the worker's `clab:deployLab` RPC — there is no separate ID-translation layer on the manager side (see [worker.md § Deploy](../architecture/worker.md#deploy-domainlabdeployts)). This PK stays stable across an auto-heal cycle: heal restarts the node in place (`containerlab restart`, not a recreate), which preserves the container ID — see [clab-monitor.md § Auto-heal](../architecture/clab-monitor.md#auto-heal-appsworkersrcservicesmonitorhealt).

## `worker.ts` — Worker daemon fleet registry

| Column                                                       | Purpose                                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `id` (PK, worker-supplied string)                            | Matches `WORKER_ID` env var on the worker daemon.                                    |
| `status`                                                     | `online\|offline`.                                                                   |
| `managerId`                                                  | Which manager replica currently owns/reconciles this worker's gRPC stream.           |
| `guacdHost`/`guacdPort`                                      | Where to route Guacamole console connections for this worker's nodes.                |
| `cpuCores`/`memoryMB`/`storageMB`                            | Static capacity, from the `WorkerSpec` handshake.                                    |
| `cpuUsagePercent`/`memoryUsagePercent`/`storageUsagePercent` | Live usage, from periodic `SendMetrics` RPCs.                                        |
| `activeLabs`/`activeNodes`                                   | Current load counters.                                                               |
| `deployingLab`                                               | In-flight deploy counter, used for race-free scheduling (`tryGetAvailableWorkerId`). |

Has Postgres `CHECK` constraints enforcing positive capacity and 0–100 usage percentages.

## `device-template.ts` — device catalog

| Table             | Key columns                                                                                                                                                                                                                                                        | Relationships       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| `device_category` | `name`, `color`                                                                                                                                                                                                                                                    | —                   |
| `device_template` | `name`, `icon`, `kind` (Containerlab kind, e.g. `cisco_xrv9k`), `image`, `env`/`resources`/`connection`/`interfaces` (jsonb), `cpuCostCores`/`memoryCostMB` (scheduling cost hints, nullable → defaults `DEFAULT_CPU_COST_CORES=0.5`/`DEFAULT_MEMORY_COST_MB=512`) | → `device_category` |

## `topology-template.ts`

`topology_template` (`name`, `topology` jsonb) — reusable canned topologies for the lab editor, independent of any specific lab.

## `file.ts`

`file` (unique `name` = content-hash-derived S3 object key) — tracks which uploaded objects are referenced by `lab.cover`/`lab_attachments`/`lab_embedded_file`, for orphan garbage-collection (`storage-cleanup` BullMQ job, see [manager.md](../architecture/manager.md#background-jobs--queues--redis)).

## Migrations

Chronological history (`apps/manager/migrations/0000`–`0012`): init schema → add lab-session `clientId` → `worker` table → orphan-file search/GC support → `lab_embedded_file` → `worker.guacdHost/guacdPort` → `lab_session_node.token` → `topology_template` table → replace worker "score" with usage-percent thresholds → replace thresholds with per-device-template CPU/memory cost columns → add `worker.deployingLab` counter → alter `lab_session_node.id` to text (container id) → alter `node_health` enum values.

Workflow (per `AGENTS.md` §6): edit schema in `src/db/schema/*.ts` → `bun run drizzle:generate --name <action>_<entity>_<detail>` → migrations auto-apply on next manager boot (`checkAndRunMigration()` in `startServer()` — manual `drizzle:migrate` rarely needed).
