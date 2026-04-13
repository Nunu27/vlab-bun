---
name: vlab-backend-route
description: 'Workflow for creating or updating vLab backend API routes. Use when adding new Elysia endpoints, modifying Drizzle ORM schemas/queries, or updating shared DTOs in @vlab/shared. Ensures strict typesafety and monorepo compliance.'
---

# vLab Backend Route Creation

## When to Use
- Adding or modifying Elysia endpoints in `apps/api/src/routes`.
- Adding new database models/queries in `apps/api/src/db` using `drizzle-orm`.
- Creating or updating shared schemas/DTOs in `@vlab/shared` to maintain full-stack typesafety.

## Prerequisites & Rules
- **Typesafety**: No `any`. Strict typings are mandatory.
- **Validation**: Use `@sinclair/typebox` for all API route validations in Elysia.
- **Schemas**: Ensure request schemas exist in the `@vlab/shared` package for the frontend/backend to use.
- **Package Manager**: Use `bun` ONLY.
- **Standardization**: Leverage `@jawit/common` for standard responses and `@jawit/paginator` if building a list endpoint.

## Procedure

### 1. Define the Shared Schema
Navigate to `packages/@vlab/shared` and add or amend the relevant Typebox models.
```typescript
// Example: adding to a feature-specific schema file
import { Type } from '@sinclair/typebox';
export const MyFeatureSchema = Type.Object({ ... });
```

### 2. Update Database Schema & Queries (If Applicable)
If database interaction is required:
- Update `apps/api/src/db/schema/...` with Drizzle ORM.
- Create new query/service functions inside `apps/api/src/services/` or directly inside the endpoint.
- Always run `bun run drizzle:generate --name <migration_name>` and `bun run drizzle:migrate` from `apps/api` via the terminal if the schema is modified. (Don't forget to name the migration!)

### 3. Implement the Route
Create or update the endpoint in `apps/api/src/routes/`.
- Use the shared DTOs for `body`, `query`, and `response` validation.
- Make sure to handle caching with `@jawit/elysia-caching` if it's a heavily-read GET endpoint.
- Add logging and standard error handlers.

### 4. Code Quality Check
- Format and lint code: `bun run format && bun run lint`
- Ensure no type errors: `bun check` in the relevant workspace.
