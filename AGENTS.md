# vLab Monorepo - Agent Instructions

## 🚨 Core Rules
- **Bun Workspaces**: This project strictly uses `bun`. ALWAYS use `bun` instead of `npm`, `yarn`, or `pnpm` for script execution and dependency management.
- **Strict Typesafety**: Typesafety is a must, it is the primary goal. 
- **No `any`**: DO NOT use the `any` type unless absolutely necessary.
- **Tooling**: Use `@biomejs/biome` for linting and formatting (`bun run lint`, `bun run format`). Do NOT introduce `eslint` or `prettier`.
- **AI File Operations**: Do NOT use CLI commands like `cat`, `sed`, `echo`, or `grep` to read/edit files. ALWAYS use your built-in tools for reading, writing, and searching through files.
- **Meaningful Comments**: Write comments ONLY for useful contextual information like `TODO`s, warnings, architectural decisions, or explaining very complex business logic. Do NOT write trivial comments that explain what simple, self-evident code does.

## 🏗️ Architecture & Stack
This is a monorepo consisting of `/apps` and `/packages`. 

### 📦 Internal Packages (`/packages`)
Always leverage these internal packages before adding external dependencies or writing new utilities from scratch:

**`@jawit/*` (Generic & Infrastructure)**
- `common`: Standardized API responses and common generic types.
- `elysia-caching`: Caching wrappers and utilities for the Elysia backend.
- `paginator`: Pagination schema definitions, queries, and parsers.
- `query`: TanStack Query hooks and data-fetching wrappers.
- `ws`: WebSocket base adapters (Client/Server) wrapping `socket.io` and related React UI hooks.
- `zustand-helper`: Utility functions and bindings for Zustand stores.

**`@vlab/*` (Domain-Specific Context)**
- `shared`: The single source of truth for core business schemas (Auth, Admin, Lab, Student, etc.), enums, and shared DTOs used across frontend and backend.
- `clab` & `clab-monitor`: Containerlab definitions, deployment wrappers, and network monitoring for device interfaces (Linux, MikroTik, etc).
- `evaluator`: Core logic for assessment sessions, evaluators, and node interactions.
- `ws`: Domain-specific WebSocket payloads and event contracts (e.g., lab sessions, device templates).

### 🌐 Backend (`apps/api/`)
- **Framework**: `elysia` (Elysia.js)
- **Validation**: `@sinclair/typebox` (Elysia's built-in target)
- **Database**: `drizzle-orm` with PostgreSQL (`pg`)
- **Websockets**: `socket.io` with `@msgpack/msgpack` parser
- **Logging**: `pino`
- **Containerization APIs**: `dockerode`
- **Other**: `ioredis`, `guacamole-lite`

### 🖥️ Frontend (`apps/web/`)
- **Core**: React 19 + TypeScript + Vite
- **Routing**: `@tanstack/react-router` (File-based, typesafe routing)
- **Data Fetching/State**: `@tanstack/react-query` & `zustand`
- **Forms**: `@tanstack/react-form`
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`), `radix-ui`, `shadcn` components
- **Drag & Drop**: `@dnd-kit/*`
- **Websockets**: `socket.io-client` with msgpack parser