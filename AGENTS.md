# AI Agents Guidelines (AGENTS.md)

Welcome! You are an AI coding assistant working on the **vLab** project. Please read and adhere to these guidelines to ensure consistency and quality across the codebase.

## 1. Project Context & Architecture
**vLab** is a Virtual Lab management system orchestrating Containerlab-based network topologies.
It utilizes a **Manager-Worker** architecture:
- **Manager**: The central orchestrator, API, and database manager.
- **Worker (Agent)**: A long-running daemon installed on host machines that physically provisions and manages containerized labs.

## 2. Monorepo Structure
- `apps/manager`: Central Elysia.js API & Orchestrator.
- `apps/worker`: Execution daemon for Containerlab nodes.
- `apps/web`: React 19 / Vite frontend.
- `packages/*`: Shared logic (`@vlab/shared`, `@vlab/grpc`, `@jawit/common`, etc.). **Rule:** Always update shared packages when modifying common types or communication protocols.

## 3. Tech Stack & Tooling
- **Runtime:** MUST use **Bun** (never `npm` or `yarn`). Run commands via `bun run`.
- **Backend:** Elysia.js, Drizzle ORM, gRPC, Waycast, PostgreSQL, Redis.
- **Frontend:** React 19, Vite, Tailwind CSS v4, Zustand, TanStack Query/Router, Shadcn UI.
- **Linting/Formatting:** MUST use **Biome**. Do not use ESLint or Prettier.

## 4. Coding Conventions & Best Practices
- **Type Safety**: We use TypeScript for a reason. **Do NOT** ditch typing by casting to `any` or `never` unless absolutely necessary.
- **Comments**: **Do NOT** write comments when the code's responsibility is obvious. Only write comments to explain special cases, exceptions, or complex/non-obvious logic.
- **Flagging**: Please mark sections of code that are yet to be implemented or are currently being mocked with a `TODO` comment.
- **Imports**: Use TypeScript path aliases (e.g., `@manager/...`) and workspace imports (e.g., `"@vlab/shared": "workspace:*"`) instead of complex relative paths.
- **Database**: When modifying schemas (`apps/manager/src/db/schema/*`), always generate migrations with a meaningful name using `rtk bun run drizzle:generate --name <meaningful_name>` and then apply them with `rtk bun run drizzle:migrate`. The migration name must follow a clear convention such as `<action>_<entity>_<detail>` (e.g., `create_users_table`, `add_status_to_lab_sessions`).
- **Cross-Boundary Changes**: When altering Websocket/Waycast payloads or gRPC protobufs, apply changes to both the Manager and Worker simultaneously to prevent breaking the system.

## 5. RTK - Rust Token Killer
**Usage**: Token-optimized CLI proxy for shell commands.

**Rule**: Always prefix shell commands with `rtk` to minimize token consumption. RTK filters and compresses command output before it reaches your LLM context, saving 60-90% tokens on common operations. Always use `rtk <cmd>` instead of raw commands.

**Examples**:
```bash
rtk git status
rtk bun run typecheck
rtk ls src/
rtk grep "pattern" src/
rtk docker ps
```

**Meta Commands**:
```bash
rtk gain              # Show token savings
rtk gain --history    # Command history with savings
rtk discover          # Find missed RTK opportunities
rtk proxy <cmd>       # Run raw (no filtering, for debugging)
```

## 6. Verification & Testing
Before presenting changes, verify your work using these commands:
- `rtk bun run typecheck` (Ensures strict TS safety across the monorepo)
- `rtk bun run check` (Biome linting)
