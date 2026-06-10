# AI Agents Guidelines (AGENTS.md)

You are an AI coding assistant working on the **vLab** project. These rules are **non-negotiable** — read and follow them precisely.

---

## 1. Planning & Confirmation Workflow

Every non-trivial task **MUST** follow this strict plan-first workflow. Do not skip or shortcut it.

### 1.1 Always Plan First
Before writing a single line of code or running any modifying command, produce a clear, complete plan that includes:
- **What** — files to create, modify, or delete; commands to run.
- **Why** — the reasoning behind each decision.
- **Impact** — side effects, breaking changes, or risks.
- **Order of operations** — the exact sequence of steps.

If any part of the task is ambiguous or requires information only the user has, **ask first** — do not waste time researching or guessing. Include those questions in the plan presentation.

**Use available planning tools**: Before presenting a plan, check your system prompt for any planning tools, artifact mechanisms, or UI-visible plan interfaces. **You MUST use them if they are available** — do not write the plan as a plain chat response when a dedicated tool exists. A plain chat response is only acceptable as a last resort when no such tools are provided by your environment.

Present the plan to the user and **stop**. Do not proceed until the user explicitly confirms.

### 1.2 Ask Before Assuming
If any requirement is ambiguous or depends on context only the user knows (e.g., intended behavior, design decisions, missing specs), **ask the user directly** rather than making assumptions or spending time researching independently.

Group all your questions together and ask them upfront alongside the plan — do not drip-feed questions one by one after receiving each answer.

### 1.3 Waiting for Confirmation
After presenting the plan, your only allowed actions are:
- Answering clarifying questions the user raises.
- Rewriting the plan based on feedback (see §1.3).

You **MUST NOT** begin implementation, run modifying shell commands, or edit any source files until the user gives a clear go-ahead (e.g., "yes", "looks good", "proceed", "approve").

If you asked clarifying questions alongside the plan, wait for all answers before starting — do not begin on partial information.

### 1.4 Handling Feedback — Rewrite, Then Wait Again
If the user provides feedback or requests changes to the plan:
1. **Rewrite** the full plan incorporating the feedback. Do not patch the diff inline — produce a clean, updated plan.
2. Present the updated plan to the user.
3. **Stop again** and wait for fresh confirmation before proceeding.

Repeat this loop as many times as needed. Implementation starts only after explicit approval of the latest plan revision.

### 1.5 Mid-Implementation Issues & Change of Plans
If an unexpected blocker or new information arises during implementation that requires deviating from the approved plan:
1. **Stop immediately** — do not improvise silently.
2. Inform the user of:
   - **What happened** (the unexpected issue or discovery).
   - **What you propose to do** (the revised approach).
   - **Why** the original plan no longer works.
3. Wait for user feedback or confirmation before continuing.

This ensures the user is never surprised by undisclosed scope changes.

---

## 2. Project Context & Architecture

**vLab** is a Virtual Lab management system orchestrating Containerlab-based network topologies.
It uses a **Manager-Worker** architecture:
- **Manager**: The central orchestrator, API, and database manager.
- **Worker (Agent)**: A long-running daemon installed on host machines that physically provisions and manages containerized labs.

---

## 3. Monorepo Structure

| Path | Description |
|---|---|
| `apps/manager` | Central Elysia.js API & Orchestrator |
| `apps/worker` | Execution daemon for Containerlab nodes |
| `apps/web` | React 19 / Vite frontend |
| `packages/*` | Shared logic (`@vlab/shared`, `@vlab/grpc`, `@jawit/common`, etc.) |

**Rule**: Always update shared packages when modifying common types or communication protocols.

---

## 4. Tech Stack & Tooling

- **Runtime**: MUST use **Bun** (never `npm` or `yarn`). Run commands via `bun run`.
- **Backend**: Elysia.js, Drizzle ORM, gRPC, Waycast, PostgreSQL, Redis.
- **Frontend**: React 19, Vite, Tailwind CSS v4, Zustand, TanStack Query/Router, Shadcn UI.
- **Linting/Formatting**: MUST use **Biome**. Do not use ESLint or Prettier.

### RTK — Rust Token Killer
Always prefix shell commands with `rtk` to minimize token consumption. RTK filters and compresses output, saving 60–90% tokens.

```bash
rtk git status
rtk bun run typecheck
rtk ls src/
rtk grep "pattern" src/
rtk docker ps
```

Meta commands:
```bash
rtk gain              # Show token savings
rtk gain --history    # Command history with savings
rtk discover          # Find missed RTK opportunities
rtk proxy <cmd>       # Run raw (no filtering, for debugging)
```

---

## 5. Coding Conventions & Best Practices

- **Type Safety**: Do **NOT** cast to `any` or `never` unless absolutely necessary.
- **Comments**: Do **NOT** write comments when the code's responsibility is obvious. Only comment to explain special cases, exceptions, or complex/non-obvious logic.
- **TODOs**: Mark unimplemented or mocked sections with a `// TODO` comment.
- **Assumptions & Workarounds**: If you work around an architectural limitation (e.g., a missing property in Waycast), you **MUST** flag it with a `// TODO` comment explaining the workaround. Do not implement complex workarounds silently.
- **Imports**: Use TypeScript path aliases (e.g., `@manager/...`) and workspace imports (e.g., `"@vlab/shared": "workspace:*"`) instead of complex relative paths.
- **Cross-Boundary Changes**: When altering WebSocket/Waycast payloads or gRPC protobufs, apply changes to **both** Manager and Worker simultaneously to prevent breaking the system.

---

## 6. Database & Migration Rules

When modifying schemas under `apps/manager/src/db/schema/*`:

1. Generate a migration with a meaningful name:
   ```bash
   rtk bun run drizzle:generate --name <meaningful_name>
   ```
2. Apply the migration:
   ```bash
   rtk bun run drizzle:migrate
   ```

Migration naming convention: `<action>_<entity>_<detail>`
- Examples: `create_users_table`, `add_status_to_lab_sessions`

---

## 7. Verification & Testing

Before presenting any changes to the user, always verify:

```bash
rtk bun run typecheck   # Strict TS safety across the monorepo
rtk bun run check       # Biome linting
```

Do not present changes that fail either check without explicitly noting the remaining errors and why they are acceptable or will be addressed separately.
