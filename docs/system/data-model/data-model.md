# Data Model & Database

This document is a reference for the vLab database schema.

vLab uses **PostgreSQL** as its primary relational database, accessed exclusively through **[Drizzle ORM](https://orm.drizzle.team/)** over Bun's native SQL client (`drizzle-orm/bun-sql`, *not* `postgres.js` or `node-postgres`).

## Database Access

> [!IMPORTANT]
> Only the Manager (`apps/manager`) connects to PostgreSQL. Workers never touch the database directly — this keeps the Manager as the single source of truth and keeps DB credentials off host machines.

## Schemas & Location

- **Schema location:** `apps/manager/src/db/schema/*.ts` — one file per aggregate, re-exported through `schema/index.ts`.
- **Connection:** `apps/manager/src/db/index.ts` — `drizzle({ schema, casing: "snake_case", connection: { url, idleTimeout: 900, connectionTimeout: 30 } })`. No explicit pool-size cap; relies on Bun's SQL client defaults.
- **Migrations:** Drizzle Kit, config at `apps/manager/drizzle.config.ts` (`out: "./migrations"`, `dialect: "postgresql"`, `casing: "snake_case"`). Generate with:
  ```bash
  rtk bun run drizzle:generate --name <action>_<entity>_<detail>
  ```
  Migrations run automatically at Manager boot (`checkAndRunMigration()` in `db/index.ts`), and the compiled build copies the `migrations/` folder alongside the binary so they ship with the deployed app rather than running from source.

## Core Entities

### Identity: `department` -> `study_program` -> `user` (`student` / `instructor`)

- `user`: `name`, `email` (unique), `passwordHash` (nullable — CAS-authenticated students have none), `role` (student/instructor/admin).
- `student` and `instructor` use **table-per-type inheritance**: their primary key is itself a foreign key to `user.id` (cascade delete), not a separate `userId` column.
  - `student` adds `nrp` (unique student id, parsed from CAS), `year`, `degreeLevel`, and `studyProgramId` -> `study_program` (restrict).
  - `instructor` adds `nip` (unique staff id).
- `department` -> `study_program` (restrict) is an academic hierarchy above `student` — not present in earlier iterations of this schema.

### `lab` — instructor-authored lab templates

Columns of note: `name`, `cover`, `content`, `instructions`, `maxAttempt`, `sessionDuration` (minutes, default 180), `instructorId` -> `instructor` (restrict), `startAt`/`endAt`, `isPublished`.

Two JSONB columns carry the actual lab definition:

- **`topology`** (`LabTopology`, shared with `topology_template` — see below): `{ deviceCounts, devices: Record<uuid, LabDeviceNode>, groups, notes, edges: Record<uuid, LabEdge> }`. Each `LabDeviceNode` carries its `deviceId` (-> `device_template`), group memberships, optional per-node resource/credential overrides, and its interface-to-edge mapping. `LabEdge` is a two-endpoint tuple (`{deviceId, interface}` x2).
- **`checks`** (`LabChecksMap`): `Record<uuid checkId, { nodeId, checkId, params, weight }>` — the grading rules for this lab, where `checkId` identifies a check type registered in `@vlab/evaluator` (see [Lab Evaluation Engine](../evaluator/evaluator.md)) and `weight` feeds the final score calculation.

Related tables:
- `lab_attachments` (`labId` cascade, unique on `(labId, file)`) — files attached to the lab.
- `lab_embedded_file` (composite PK `(labId, file)`, no `id`/timestamps) — files referenced inline from the lab's markdown content.
- `lab_enrollment` (composite PK `(labId, studentId)`) — the roster: which students are assigned to a lab. Distinct from `lab_session`, which is a specific *attempt*.

### `lab_session` — a student's attempt at a lab

`labId` (cascade), `studentId` (cascade), `workerId` -> `worker` (cascade), `clientId` (nullable — the currently-owning WebSocket request, see the [session take-over fix](../communication/communication.md#the-session-take-over-race-fixed)), `score` (numeric, default 0), `submittedAt`, `dueDate`.

- `lab_session_check` (composite PK `(labSessionId, checkId)`) — pass/fail state for each check defined in the lab's `checks` JSONB. `checkId` correlates to a key in that map; it is not a foreign key.
- `lab_session_node` — the live/provisioned state of each device instance within a session: `name`, `health`, `ip`, `interfaces` (`Record<interfaceName, string[]>`), `containerId`, `token` (per-node console/auth token), `labNodeId` (correlates to a key in the lab's `topology.devices`, not an FK), `labSessionId` (cascade) and `deviceTemplateId` -> `device_template` (restrict). This is the table `@vlab/clab-monitor`'s telemetry ultimately writes through.

Scoring happens once, at submission (`apps/manager/src/domain/lab-session/submit.ts`): `score = round(completedWeight / totalWeight * 100)`, summed over the lab's `checks` JSONB and the session's `lab_session_check` completion state. The Worker only ever reports boolean check transitions — weighting and the final percentage are Manager-side.

### `worker` — the Worker fleet

PK is `text` (not uuid — assigned by hostname/identity, not generated), `status` (online/offline), `guacdHost`/`guacdPort`, `lastSeen`, capacity (`cpuCores`, `memoryMB`, `storageMB`) and live usage (`cpuUsagePercent`, `memoryUsagePercent`, `storageUsagePercent`), plus `activeLabs`/`activeNodes` counters used by [worker selection](../architecture/architecture.md#4-worker-selection). CHECK constraints enforce positive capacity and 0-100 usage percentages.

This table has churned recently: it used to carry its own `score`, then `cpu/memoryThresholdPercent` columns for admission control; both were removed in favor of per-`device_template` cost fields (below) — the Worker now only reports raw capacity and live usage, and all placement math lives in the scheduling query.

### `device_category` / `device_template`

- `device_category`: `name`, `color` — UI grouping only.
- `device_template`: `name`, `icon`, `kind` (matches `@vlab/shared`'s `deviceKindValues` — the containerlab node kinds vLab supports), `image`, `deviceCategoryId` (restrict), `env` (JSONB `Record<string,string>`), `resources` (JSONB `{cpu?, memory?}` override), `connection` (JSONB — Guacamole protocol + connection params: `{type: "rdp"|"vnc"|"ssh"|"telnet", data: {port, username?, password?}}`), `interfaces` (JSONB array of `{name, configurable}`), and the capacity-planning fields `cpuCostCores`/`memoryCostMB` (nullable — used by worker selection, populated via the admin Test Connection flow).

### `topology_template`

`name` + `topology` (JSONB, same `LabTopology` shape as `lab.topology`) — lets instructors save and reuse a topology layout independent of any specific lab. Not part of earlier iterations of this schema.

### `file`

Minimal registry: `name` (unique). Referenced by `lab_attachments.file`/`lab_embedded_file.file` by matching text value, not a DB-level foreign key. Actual file bytes live in RustFS (S3-compatible object storage); the hourly `storage-cleanup` BullMQ job finds files no longer referenced by any lab cover, attachment, or embedded reference and garbage-collects them.

## Entity Relationship Diagram

See [System ERD](./system.erd.json) (exported from Drizzle Studio) for the full schema and foreign-key graph.
