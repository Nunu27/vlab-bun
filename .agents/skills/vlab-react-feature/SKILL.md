---
name: vlab-react-feature
description: 'Workflow for building frontend features in the vLab monorepo. Use when creating React 19 pages, UI components, @tanstack/react-router routes, and data-fetching hooks with @tanstack/react-query.'
---

# vLab Frontend Feature Creation

## When to Use
- Building new React components, pages, or routes in `apps/web/`.
- Integrating data from the `api` app into the Web app using `@tanstack/react-query` and `@vlab/shared` schemas.
- Building stateful features using Zustand.

## Prerequisites & Stack Rules
- **View/Component**: React 19 + TypeScript.
- **Styling**: Tailwind CSS v4, `radix-ui`, `shadcn/ui` components.
- **Routing**: `@tanstack/react-router` (Typesafe file-based routing).
- **Data/State**: `@tanstack/react-query`, `zustand`, `@jawit/query`, `@jawit/zustand-helper`.
- **Forms**: `@tanstack/react-form`.
- **No `any`**: Ensure strict typesafety. Pull types directly from `@vlab/shared` if they represent backend schemas.

## Procedure

### 1. Identify Component Types
Determine if the feature needs:
- **Routes / Pages**: Create new route files following the `@tanstack/react-router` standard in `apps/web/src/routes`.
- **Components**: UI level components go into `apps/web/src/components/`. If extending shadcn/ui, use the `shadcn` skill.

### 2. Define Data Hook
If data needs to be fetched from the vLab backend:
- For pagination or infinite lists, use the builtin templates `useApiPagination` and `useApiInfiniteList`.
- For other queries, use `@jawit/query` wrappers integrating with `@tanstack/react-query` to interface with the Elysia endpoints.
- Ensure the hook types match the Elysia API payload structure using the strict data contracts provided in `packages/@vlab/shared/src/schemas`.

### 3. Build UI
- Connect the React component to the router state or query hooks.
- For forms, implement strictly using `useApiForm` which wraps `@tanstack/react-form` and integrates directly with our API contracts.
- Style using Tailwind v4 utility classes and predefined component foundations. If writing custom CSS, put it in `styles.css` strictly for variables/global state.

### 4. Review & Validate
- **Lint/Format**: `bun run lint && bun run format`
- **Validate State**: Review Zustand stores for any complex client-side state, utilizing `@jawit/zustand-helper` when integrating.
- Ensure all comments added provide context on architecture, warning logic, and business use-cases, rather than trivial details.
