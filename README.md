# vLab

A distributed virtual network lab management platform that orchestrates [Containerlab](https://containerlab.dev/) topologies on remote hosts. Built for network engineering courses and hands-on lab exercises, vLab lets instructors define labs and evaluations while students provision, interact with, and get assessed on live container-based network environments.

---

## Architecture

vLab uses a **Manager-Worker** architecture designed to run Containerlab on bare-metal or VM hosts without giving the central server direct Docker or SSH access.

```
  Browser (Student/Instructor)
        │
        │ HTTPS / WebSocket
        ▼
  ┌─────────────┐     gRPC      ┌──────────────┐
  │   Manager   │◄─────────────►│   Worker #1  │──► Containerlab
  │  (Elysia)   │               └──────────────┘    (Docker host)
  │             │     gRPC      ┌──────────────┐
  │  PostgreSQL │◄─────────────►│   Worker #2  │──► Containerlab
  │  Redis      │               └──────────────┘    (Docker host)
  │  RustFS     │
  └─────────────┘
```

- **Manager** — Central API server. Owns the database, handles auth, manages job queues, proxies terminal access (Guacamole), and relays real-time telemetry to the web UI.
- **Worker** — Long-running daemon installed on each lab host. Executes `containerlab deploy/destroy`, monitors container health, and streams metrics back to the Manager via gRPC.
- **Web UI** — React 19 SPA. Communicates exclusively with the Manager; never touches a Worker directly.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh) |
| API Framework | [Elysia.js](https://elysiajs.com) |
| Frontend | React 19, Vite, TanStack Router/Query |
| Styling | Tailwind CSS v4, shadcn/ui |
| Database | PostgreSQL 18 + Drizzle ORM |
| Cache / Queue | Redis + BullMQ |
| RPC | gRPC (nice-grpc) |
| WebSocket | Socket.io + msgpack |
| Container Orchestration | [Containerlab](https://containerlab.dev) |
| Terminal Proxy | [guacamole-lite](https://github.com/vadimdemedes/guacamole-lite) (SSH/VNC/Telnet) |
| Object Storage | RustFS (S3-compatible) |
| Deployment | Docker Swarm |
| Linting / Formatting | [Biome](https://biomejs.dev) |

---

## Project Structure

```
vlab/
├── apps/
│   ├── manager/          # Central API orchestrator (Elysia.js)
│   ├── worker/           # Host daemon (gRPC server + Containerlab)
│   └── web/              # React 19 frontend
├── packages/
│   └── @vlab/
│       ├── shared/       # Shared types, enums, constants
│       ├── grpc/         # Generated gRPC definitions
│       ├── ws/           # WebSocket message schemas
│       ├── evaluator/    # Lab evaluation engine
│       ├── clab/         # TypeScript Containerlab wrapper
│       └── clab-monitor/ # Docker event monitor for lab lifecycle
├── docs/                 # Architecture, deployment, and module docs
├── scripts/              # Dev tooling and deployment automation
├── docker-compose.yml    # Docker Swarm stack definition
├── Dockerfile.manager
├── Dockerfile.worker
└── Dockerfile.installer  # Auto-deploys workers across Swarm nodes
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.3
- Docker with Swarm initialized (for production)
- PostgreSQL and Redis (provided via Docker Compose in development)

### Development

```bash
# Install all workspace dependencies
bun install
```

Copy the example env files and adjust values as needed:

```bash
cp apps/manager/.env.example apps/manager/.env
cp apps/worker/.env.example apps/worker/.env
```

**`apps/manager/.env`**

| Variable | Default | Description |
|---|---|---|
| `MANAGER_ID` | `manager-1` | Unique identifier for this manager instance |
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `3000` | HTTP API port |
| `GRPC_PORT` | `50051` | gRPC server port (workers connect here) |
| `DISPLAY_PORT` | `8080` | Guacamole display proxy port |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/vlab` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `S3_ENDPOINT` | `http://localhost:9000` | RustFS/S3-compatible object storage URL |
| `S3_ACCESS_KEY` | `minioadmin` | S3 access key |
| `S3_SECRET_KEY` | `minioadmin` | S3 secret key |
| `BASE_URL` | `http://localhost:3000` | Public-facing Manager URL (used for callbacks) |
| `CAS_BASE_URL` | — | CAS SSO base URL (e.g. `https://login.pens.ac.id`) |
| `COOKIE_SECRET` | — | 32+ char secret for signing session cookies |
| `GUACD_SECRET` | — | 32+ char secret for signing Guacamole tokens |
| `LOG_LEVEL` | `debug` | Pino log level (`debug`, `info`, `warn`, `error`) |
| `ENABLE_OPENAPI` | `true` | Expose OpenAPI docs at `/swagger` |

**`apps/worker/.env`**

| Variable | Default | Description |
|---|---|---|
| `WORKER_ID` | `worker-1` | Unique identifier for this worker instance |
| `NODE_ENV` | `development` | Runtime environment |
| `MANAGER_GRPC_URL` | `localhost:50051` | Manager gRPC address the worker connects to |
| `GUACD_HOST` | `127.0.0.1` | guacd daemon host (runs alongside the worker) |
| `GUACD_PORT` | `4822` | guacd daemon port |
| `CLAB_CLI_PATH` | `containerlab` | Path to the `containerlab` binary |
| `CLAB_TOPOLOGIES_PATH` | `/var/lib/vlab/topologies` | Directory where topology files are written |
| `CLAB_MGMT_NETWORK` | `clab-mgmt` | Docker network name for Containerlab management |
| `LOG_LEVEL` | `debug` | Pino log level |

Then start all apps:

```bash
bun run dev
```

| App | URL |
|---|---|
| Web UI | http://localhost:5173 |
| Manager API | http://localhost:3000 |
| Manager gRPC | localhost:50051 |

Seed the database with initial data:

```bash
bun run manager seed
```

### Production — Docker Swarm

Copy and fill in environment files, then deploy the full stack:

```bash
# Initialize Docker Swarm (if not already done)
docker swarm init

# Deploy the stack
docker stack deploy -c docker-compose.yml vlab
```

The stack includes: Manager, Worker auto-installer (deployed globally to every Swarm node), PostgreSQL, Redis, RustFS, Nginx reverse proxy, and Let's Encrypt ACME companion.

See the [full deployment guide](docs/deployment/index.md) for environment variable reference and a manual deployment option.

---

## Manager CLI

The Manager binary doubles as a maintenance CLI:

```bash
bun run manager serve           # Start the API server
bun run manager seed            # Seed the database
bun run manager backup          # Backup DB + object storage to lab_backup/
bun run manager restore         # Restore from lab_backup/
bun run manager reset-sessions  # Clear all active lab sessions
```

---

## Lab Evaluation

vLab has a built-in evaluation engine (`@vlab/evaluator`) that checks student lab configurations automatically. Supported node types:

- **Linux** — systemd services, routing tables, user accounts
- **MikroTik RouterOS** — OSPF, RIP, BGP, interface state
- **Generic** — ping reachability, custom command output

---

## Linting & Type Checking

```bash
bun run typecheck    # TypeScript check across all workspaces
bun run check        # Biome lint + format check
bun run lint         # Biome lint with auto-fix
bun run format       # Biome format
```

> This project uses **Biome** exclusively. Do not use ESLint or Prettier.

---

## Documentation

Internal developer docs live in [`docs/`](docs/):

| Doc | Description |
|---|---|
| [Architecture](docs/system/architecture/architecture.md) | Manager-Worker design rationale |
| [Communication](docs/system/communication/communication.md) | gRPC, WebSocket, Waycast protocol |
| [Data Model](docs/system/data-model/data-model.md) | Database schema and entity relationships |
| [Frontend](docs/system/frontend/frontend.md) | React, routing, state management |
| [Containerlab](docs/system/containerlab/containerlab.md) | Topology parsing and container lifecycle |
| [Evaluator](docs/system/evaluator/evaluator.md) | Evaluation engine and check handlers |
| [Deployment](docs/deployment/index.md) | Docker Swarm and manual deployment guides |
