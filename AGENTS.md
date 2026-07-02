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
- Approval must be **explicit and unambiguous** — phrases like "looks good", "that makes sense", or "interesting" do **not** constitute approval.
- If any requirement is ambiguous, **ask the user** — do not guess or assume.
- Group all questions upfront alongside the plan; do not drip-feed them.
- If you need to deviate from the approved plan mid-implementation, **stop immediately**, explain what changed and why, and wait for re-approval before continuing.
- Use available planning tools/artifacts when they exist — do not write plans as plain chat.
- **Stay in scope** — do not refactor, rename, or touch files outside the approved plan, even if you notice improvements. Note them as suggestions instead.
- **No speculative changes** — do not add "while I'm here" improvements unless explicitly asked.

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

- **No `any` type** — avoid `as any`, `z.any()`, or untyped parameters. If genuinely unavoidable, add an inline comment explaining why.
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

- Skip verification **only** for documentation-only changes (`.md` files, comments). Always run for any `.ts`, `.tsx`, or config file changes.
- If checks fail, **fix the errors before presenting** — do not ask the user to run the checks themselves.
- Do not present changes that still fail either check without explicitly noting the remaining errors and justification.

---

## 8. Git Operations

Git operations that modify history or the remote are **never** performed autonomously.

- **Never** run `git commit`, `git push`, `git rebase`, `git reset`, `git merge`, `git add`, `git stash`, `git clean`, `git tag`, or `git rm` unless the user **explicitly confirms that specific operation in the current message** (e.g., "commit now", "push it", "go ahead and commit").
- A prior approval in the same session does **not** carry over. Each git operation requires its own fresh confirmation.
- After completing implementation and verification, **suggest** the git command(s) the user should run, including a ready-to-copy **conventional commit message** (e.g., `git commit -m "feat(manager): add X"`) — do not run them yourself.
- If the user asks you to "commit" or "push" as part of a larger task description (e.g., "implement X and commit"), treat it as intent, not immediate authorization. Finish the implementation, then **ask for explicit confirmation** before proceeding.

---

## 9. File Safety

- **Never** delete or overwrite a file unless the user explicitly asks for it.
- Before replacing a large or critical file wholesale, confirm intent if the operation is destructive and irreversible.
- Prefer targeted edits (replacing specific blocks) over full-file rewrites.

## 10. Graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
