# Codebase Tour

Welcome to the vLab codebase! This document serves as a guided tour for new developers to understand how the monorepo is structured and where to find specific pieces of logic.

vLab is a monorepo utilizing **Bun** for package management and script execution. The codebase is divided into two primary directories: `apps/` for deployable applications, and `packages/` for shared libraries and configuration.

---

## 1. Applications (`apps/`)

These are the primary, runnable services of the vLab system.

### `apps/manager`
The **Manager** is the central orchestrator and API server. It is built with [Elysia.js](https://elysiajs.com/) and acts as the source of truth for the system.
- **Key Responsibilities:** Database management (PostgreSQL via Drizzle ORM), user authentication, serving the HTTP API, and dispatching tasks to Workers.
- **Notable Locations:**
  - `src/db/`: Drizzle ORM schemas and the main database connection instance.
  - `src/services/`: The core business logic, including HTTP routes (`http/`), Waycast WebSockets (`ws/`), gRPC handlers (`grpc/`), background task queues (`queue/`), and remote desktop proxying (`guacamole-lite/`).
  - `src/seeders/`: Scripts to populate the database with initial data (Admin, Departments, etc.).

### `apps/worker`
The **Worker** is a long-running daemon that executes on remote host machines.
- **Key Responsibilities:** Directly interacting with Docker and Containerlab to spin up and tear down network topologies, and collecting system/container metrics.
- **Notable Locations:**
  - `src/handlers/`: Contains the logic for processing incoming RPC requests from the Manager (e.g., `clab.ts`, `docker.ts`, `evaluator.ts`).
  - `src/lib/`: Core Worker utilities like `clab-monitor.ts` and `system-metrics.ts`.

### `apps/web`
The **Web UI** provides the interface for both students and administrators.
- **Key Responsibilities:** Rendering the user interface, managing local state, and communicating with the Manager via HTTP and Waycast.
- **Tech Stack:** React 19, Vite, Tailwind CSS v4, Zustand (state), TanStack Query (data fetching), TanStack Router (routing), and Shadcn UI.
- **Notable Locations:**
  - `src/routes/`: TanStack Router configuration and page components.
  - `src/components/`: Reusable UI components.
  - `src/stores/`: Zustand state management.

---

## 2. Shared Packages (`packages/`)

To maintain consistency and type safety across the Manager, Worker, and Web, vLab relies on several shared packages. They are divided into two scopes: `@vlab` (domain-specific logic) and `@jawit` (general utility/helper logic).

### `@vlab` Packages
These packages contain business logic specific to the vLab domain.
- **`@vlab/shared`**: The largest shared package. It contains validation schemas (TypeBox), enums, and common TypeScript types used across all apps.
- **`@vlab/grpc`**: Defines the gRPC protocol buffers and generates the clients used for Manager-Worker communication.
- **`@vlab/ws`**: Defines the Waycast and WebSocket protocol payloads and action types.
- **`@vlab/clab` & `@vlab/clab-monitor`**: Utilities for parsing Containerlab topology files and monitoring container state and interfaces.
- **`@vlab/evaluator`**: The core Lab Evaluation Engine logic used to score student lab sessions.

### `@jawit` Packages
These packages are general-purpose utilities that could theoretically be used in any project.
- **`@jawit/common`**: Shared helper functions and generic utilities.
- **`@jawit/elysia-caching`**: A caching plugin/utility for the Elysia.js framework.
- **`@jawit/query` & `@jawit/paginator`**: Helpers for database querying, pagination, and filtering.
- **`@jawit/zustand-helper`**: Utilities to simplify Zustand store creation in the frontend.
- **`external`**: Integrations with specific vendor APIs (e.g., Mikro-RouterOS).

## Next Steps

Now that you know where things are located, continue to the [System Architecture](../architecture/architecture.md) document to learn how these components interact at runtime.
