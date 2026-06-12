# Data Model & Database

This document serves as a reference for the vLab database architecture.

vLab uses **PostgreSQL** as its primary relational database. To interact with the database in a type-safe manner, the project utilizes the **[Drizzle ORM](https://orm.drizzle.team/)**.

## Database Access

> [!IMPORTANT]
> The database is strictly owned and accessed by the Manager (`apps/manager`). Workers **do not** interact with the database directly. This is a deliberate architectural constraint to ensure the Manager remains the single source of truth and to reduce the attack surface on Worker nodes.

## Schemas & Location

All database schemas and table relationships are defined within the Manager app. Shared validation schemas (e.g. TypeBox) and Typescript types are kept in the shared package.

- **DB Schema Location:** `apps/manager/src/db/schema/*` contains the Drizzle table definitions.
- **Manager DB Instance:** `apps/manager/src/db/index.ts` handles the actual PostgreSQL connection pooling.
- **Migrations:** Migrations are handled via the Drizzle CLI. As per project guidelines, you generate migrations using:
  ```bash
  rtk bun run drizzle:generate --name <action>_<entity>_<detail>
  ```

## Core Entities

The database is built around a few central concepts:

1. **Users (`user`):** The core identity table. Additional details are stored in related `student` or `instructor` tables depending on the user's role.
2. **Lab Templates (`lab`):** Pre-defined lab topologies (Containerlab YAML) and configurations created by instructors. This table also embeds the **Rules & Checks** as a JSONB column to define the lab's grading criteria.
3. **Lab Sessions (`lab_session`):** Active instances of a Lab Template. Tracks which Worker node the session is assigned to, due dates, and the current score. The status of individual checks is tracked in the related `lab_session_check` table.
4. **Workers (`worker`):** Tracks the active Worker daemons across the cluster, including their current resource utilization (CPU, memory, storage) and health status.
5. **Device Templates (`device_template`):** Configurations for specific network devices (e.g., MikroTik RouterOS, Linux hosts) that can be used to build lab topologies.

## Entity Relationship Diagram (ERD)

For a comprehensive view of the database schema and foreign key relationships, please see the [System ERD](./system.erd.json).

*(Note: The `system.erd.json` file is exported from Drizzle Studio and can be viewed using compatible ERD visualization tools).*
