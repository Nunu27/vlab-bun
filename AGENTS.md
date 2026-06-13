# AI Agents Guidelines

You are working on the **vLab** project. Follow these rules precisely.

---

## 1. Project Context

**vLab** is a Virtual Lab management system orchestrating Containerlab-based network topologies.

**Architecture**: Manager-Worker
- **Manager** (`apps/manager`): Central Elysia.js API, orchestrator, and database owner.
- **Worker** (`apps/worker`): Long-running daemon on host machines that provisions and manages containerized labs.
- **Web** (`apps/web`): React 19 / Vite frontend.
- **Packages** (`packages/*`): Shared logic — `@vlab/shared`, `@vlab/grpc`, `@jawit/common`, etc.

When modifying shared types or communication protocols (gRPC protos, WebSocket/Waycast payloads), update **all** affected packages and apps simultaneously.

---

## 2. Planning Guardrails

- **Never** begin implementation, run modifying commands, or edit files until the user explicitly approves the plan (e.g., "yes", "proceed", "approve").
- If any requirement is ambiguous, **ask the user** — do not guess or assume.
- Group all questions upfront alongside the plan; do not drip-feed them.
- If you need to deviate from the approved plan mid-implementation, **stop immediately**, explain what changed and why, and wait for re-approval before continuing.
- Use available planning tools/artifacts when they exist — do not write plans as plain chat.

---

## 3. Task & Feature Tracking

We use the `kanban-markdown` extension for project management.
- Features/tasks are stored as markdown files with YAML frontmatter, typically in `.devtool/features/`.
- When creating, updating, or moving tasks/features, you **must** strictly follow the `kanban-markdown` skill instructions.
- Preserve exact YAML serialization formats, fractional indexing (`order`), and directory structures (e.g., `done/` subfolder for completed tasks).

---

## 4. Tech Stack

- **Runtime**: **Bun** only — never `npm` or `yarn`. Use `bun run`.
- **Backend**: Elysia.js, Drizzle ORM, gRPC, Waycast, PostgreSQL, Redis.
- **Frontend**: React 19, Vite, Tailwind CSS v4, Zustand, TanStack Query/Router, Shadcn UI.
- **Linting/Formatting**: **Biome** only — never ESLint or Prettier.

### RTK (Rust Token Killer)

Always prefix shell commands with `rtk` to compress output and save tokens.

```bash
rtk git status
rtk bun run typecheck
rtk bun run check
```

---

## 5. Coding Conventions

- **No `any`/`never` casts or schema** unless absolutely necessary.
- **Minimal comments** — only for non-obvious logic, special cases, or workarounds.
- **TODOs** — mark unimplemented/mocked sections and architectural workarounds with `// TODO`.
- **Imports** — use path aliases (`@manager/...`) and workspace imports (`"@vlab/shared": "workspace:*"`), not relative paths.
- **No non-lazy dynamic imports** — `import()` is only permitted for React lazy-loading patterns (e.g., `React.lazy(() => import(...))` or `lazy(() => import(...))`). Never use `await import(...)` inside functions or conditionally at runtime to defer or split module loading — use a static top-level `import` instead.

  ```ts
  // ✅ Allowed — React lazy loading
  const MyPage = lazy(() => import("@web/pages/my-page"));

  // ❌ Forbidden — deferred/conditional runtime import
  const { something } = await import("./some-module");
  ```

---

## 6. Database Migrations

When modifying schemas under `apps/manager/src/db/schema/*`:

```bash
rtk bun run drizzle:generate --name <action>_<entity>_<detail>
```

Migrations will be run automatically, so you do not need to execute `drizzle:migrate` yourself.

Examples: `create_users_table`, `add_status_to_lab_sessions`

---

## 7. Verification

Before presenting changes, always run:

```bash
rtk bun run typecheck
rtk bun run check
```

Do not present changes that fail either check without explicitly noting remaining errors and justification.