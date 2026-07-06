# @vlab/manager

## Overview

The Manager is the central backend orchestrator for the **vLab** project. It is responsible for providing the HTTP REST API, handling WebSockets for real-time frontend updates, exposing a gRPC endpoint for Worker daemons, and interacting with the primary database (PostgreSQL) and caching layer (Redis).

Built on **Bun** with **Elysia.js**, it operates in a multi-tenant environment, coordinating tasks across all connected students and worker nodes.

## Core Technologies

- **Runtime**: [Bun](https://bun.sh/)
- **API Framework**: [Elysia.js](https://elysiajs.com/)
- **Database ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Real-time Comms**: [Socket.io](https://socket.io/) / [Waycast](https://github.com/waycast/waycast)
- **RPC / Daemon Comms**: [nice-grpc](https://github.com/deeplay-io/nice-grpc)
- **Task Queues**: [BullMQ](https://docs.bullmq.io/)
- **Database**: PostgreSQL
- **Cache / PubSub**: Redis
- **Storage**: S3 API (via S3mini)

## Key Features

- **Centralized REST API**: Serves as the primary entry point for the web frontend.
- **WebSocket Gateway**: Handles real-time updates and notifications using Socket.io and Waycast.
- **gRPC Server**: Provides RPC endpoints for Worker daemons to manage containerlabs and stream logs/metrics.
- **SSO Authentication**: Supports CAS Single Sign-On.
- **Guacamole Proxy**: Generates and signs connection tokens for web terminal consoles.

## Directory Structure

- `src/server.ts`: Initializes the Elysia server, HTTP endpoints, WebSocket handlers, and gRPC servers.
- `src/index.ts`: The main entrypoint acting as a CLI router.
- `src/db/`: Database configuration, Drizzle schemas, and migrations.
- `src/commands/`: CLI commands (backup, restore, syncing, etc).
- `src/domain/`: Business logic, modularly organized.
- `src/services/`: External integrations and generic services (bullmq, redis, etc).
- `src/seeders/`: Database seeders for populating initial data.

## Prerequisites & Configuration

The application expects a `.env` file in this directory based on `apps/manager/.env.example`:

| Variable | Default | Description |
|---|---|---|
| `MANAGER_ID` | `"manager-1"` | Unique identifier for this manager instance |
| `NODE_ENV` | `"development"` | Runtime environment |
| `ENABLE_OPENAPI` | `"true"` | Expose OpenAPI docs at `/swagger` |
| `PORT` | `"3000"` | HTTP API port |
| `GRPC_PORT` | `"50051"` | gRPC server port (workers connect here) |
| `DISPLAY_PORT` | `"8080"` | Guacamole display proxy port |
| `DATABASE_URL` | `"postgres://postgres:postgres@localhost:5432/vlab"` | PostgreSQL connection string |
| `REDIS_URL` | `"redis://localhost:6379"` | Redis connection string |
| `S3_ENDPOINT` | `"http://localhost:9000"` | S3-compatible object storage URL |
| `S3_ACCESS_KEY` | `"minioadmin"` | S3 access key |
| `S3_SECRET_KEY` | `"minioadmin"` | S3 secret key |
| `BASE_URL` | `"http://localhost:3000"` | Public-facing Manager URL |
| `CAS_BASE_URL` | `"https://login.pens.ac.id"` | CAS SSO base URL |
| `COOKIE_SECRET` | `"supersecretcookiepassword32chars!"` | Secret for signing session cookies |
| `GUACD_SECRET` | `"supersecretguacpassword32chars!!"` | Secret for signing Guacamole tokens |
| `LOG_LEVEL` | `debug` | Pino log level |

## Development & Scripts

The application uses the `src/index.ts` file as a command router. Available commands:

| Command | Description |
|---|---|
| `bun run dev` | Start the API server in development mode (watches for changes). |
| `bun run seed` | Run database seeders to populate initial data. |
| `bun run backup` | Backup the database and S3 to `lab_backup/`. |
| `bun run restore` | Restore the database and S3 from `lab_backup/`. |
| `bun run src/index.ts reset-sessions` | Clear all lab sessions from the database. |
| `bun run src/index.ts clear-sessions [nrp]` | Clear submitted lab sessions, optionally by specific NRP. |
| `bun run sync-modules` | Sync lab modules from `docs/modules` to the database. |
| `bun run build` | Compile the application into a standalone binary at `../../out/manager/app`. |

### Database Migrations

Migrations are managed via Drizzle. To generate a new migration after modifying `src/db/schema/*`:

```bash
bun run drizzle:generate --name <action>_<entity>_<detail>
```

*(Note: Migrations are applied automatically on startup or deployment, manual `drizzle:migrate` is rarely needed).*