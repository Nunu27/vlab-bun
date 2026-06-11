---
name: web-ui
description: Guidelines and best practices for developing the web UI in the vLab project, including data fetching, forms, pagination, and UI components.
---

# Web UI Guidelines

When working on the `apps/web` project for the vLab system, follow these core guidelines to ensure consistency, type-safety, and excellent user experience.

## 1. Data Fetching and Mutations (@jawit/query)

We use `@jawit/query` as a typed wrapper for Elysia Eden Treaty. It provides robust TanStack Query integration tailored to our backend.
- **Do not** use plain fetch or standard `useQuery` from `@tanstack/react-query` manually if there is a treaty endpoint available.
- Infinite queries are pre-configured for `PaginatedData`.

**Usage Example:**
```tsx
// Query
const { data, isLoading } = client.users.get.useQuery({
  args: { query: { active: true } }
});

// Mutation
const { mutate } = client.users.post.useMutation({
  onSuccessMessage: (msg) => toast.success(msg) // Or use global configured handler
});
```

### Utility Types
When you need to extract types from an endpoint for custom components, hooks, or functions, use the utility types exported from `@jawit/query/types`.

- `ExtractTreatyData<typeof client.endpoint.get>` - Extracts the successful response data type.
- `ExtractTreatyError<typeof client.endpoint.get>` - Extracts the error response type.
- `ExtractTreatyParams<typeof client.endpoint.post>` - Extracts the expected parameter types (body, query, params) for a mutation or query.
- `ExtractTreatyPaginationData<typeof client.endpoint.index>` - Extracts the specific item type from a `PaginatedData` response.

**Example Type Extraction:**
```tsx
import type { ExtractTreatyData, ExtractTreatyParams } from "@jawit/query/types";

// Reusing types defined in the Elysia backend
type UserPayload = ExtractTreatyParams<typeof client.users.post>;
type UserResponse = ExtractTreatyData<typeof client.users.get>;
```

## 2. Forms and Pagination

We have custom hooks to wrap data fetching and state management to guarantee consistency.

### Forms (`useApiForm`)
When building forms that communicate with our Elysia API, leverage `useApiForm` rather than setting up forms manually.
- Automatically wires up form submission with mutation states.
- Standardizes error handling and payload typing.

```tsx
import { useApiForm } from "@web/hooks/form/use-api-form";

// Endpoint is passed to infer types and connect mutation automatically
const form = useApiForm(client.my.endpoint.post, {
  defaultValues: { name: "" },
  mutation: {
    // Optional mutation overrides
  }
});
```

### Pagination (`useApiPagination`)
For lists and tables, use `useApiPagination` and related hooks to manage URL parameters, filtering, and query state automatically.
- Integrates flawlessly with `PaginatedData` payloads from our Elysia API.
- Replaces manual state tracking for `page`, `limit`, and `filters`.

```tsx
import { useApiPagination } from "@web/hooks/pagination/use-api-pagination";

const { data, isLoading, setFilters } = useApiPagination(client.my.endpoint.index);
```

## 3. UI Components and Styling

- **Shadcn**: Use Shadcn UI components for the base of the UI design system. Apply utility classes via Tailwind CSS.
- **Icons**: Exclusively use **Lucide React** (`lucide-react`) for icons.

### Empty States
When showing an empty list or table, you MUST use the `Empty` component provided from Shadcn (`@web/components/ui/empty`). 
- **Call to Action (CTA) requirement**: If the context allows adding items (e.g., adding a new Department), include a button or simple interaction within the empty state to add the item directly, following the module's standard flow.
- **Instructional text**: If direct addition is not possible or managed externally (e.g., Worker setup), provide clear, simple text instructing the user on what steps to take (e.g., "Connect a worker node on the host machine to see it appear here").

**Example of an Empty State with a CTA:**
```tsx
import { Empty, EmptyContent, EmptyMedia, EmptyTitle, EmptyDescription } from "@web/components/ui/empty";
import { Plus } from "lucide-react";
import { Button } from "@web/components/ui/button";

<Empty>
  <EmptyContent>
    <EmptyMedia variant="icon">
      <Plus />
    </EmptyMedia>
    <EmptyTitle>No Departments Found</EmptyTitle>
    <EmptyDescription>
      Get started by adding a new department to the system.
    </EmptyDescription>
    <Button onClick={handleAdd}>Add Department</Button>
  </EmptyContent>
</Empty>
```

**Example of an Instructional Empty State (No CTA):**
```tsx
import { Empty, EmptyContent, EmptyMedia, EmptyTitle, EmptyDescription } from "@web/components/ui/empty";
import { Server } from "lucide-react";

<Empty>
  <EmptyContent>
    <EmptyMedia variant="icon">
      <Server />
    </EmptyMedia>
    <EmptyTitle>No Workers Connected</EmptyTitle>
    <EmptyDescription>
      To connect a worker, install and set up the vLab worker daemon on your host machine.
    </EmptyDescription>
  </EmptyContent>
</Empty>
```
