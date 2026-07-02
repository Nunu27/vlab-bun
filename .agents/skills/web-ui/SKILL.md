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

## 3. Tables (`DataTable` + TanStack Table)

All paginated lists/tables must use the shared `DataTable` component (`@web/components/data-table/data-table`), which is already wired to TanStack Table internally. **Do not** build raw `useReactTable` setups in page-level code unless you have a very specific reason.

### Pattern: Columns file + DataTable

Each module that shows a table should have a dedicated `columns.tsx` file that exports a typed `ColumnDef[]` array. Wire it to `<DataTable>` alongside a `useApiPagination` result.

```tsx
// -module/columns.tsx
import type { ColumnDef } from "@tanstack/react-table";
import type { DepartmentItem } from "./types";
import { DepartmentActionsCell } from "./components/department-actions-cell";

export const departmentColumns: ColumnDef<DepartmentItem>[] = [
  {
    accessorKey: "index",
    size: 60,
    enableHiding: false,
    enableSorting: false,
    meta: { label: "#", center: true },
    cell: ({ row }) => (
      <span className="block w-full text-center font-medium">
        {row.original.index}
      </span>
    ),
  },
  {
    accessorKey: "name",
    enableHiding: false,
    meta: { label: "Name", isGrow: true },
  },
  {
    id: "actions",
    size: 60,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => <DepartmentActionsCell department={row.original} />,
  },
];
```

```tsx
// Page component
import { DataTable } from "@web/components/data-table/data-table";
import { useApiPagination } from "@web/hooks/pagination/use-api-pagination";
import { departmentColumns } from "./-module/columns";

const pagination = useApiPagination(client.departments.index);

<DataTable
  pagination={pagination}
  columns={departmentColumns}
  searchPlaceholder="Search departments…"
  emptyMessage="No departments found."
/>;
```

### `DataTableProps` reference

| Prop | Type | Required | Notes |
|---|---|---|---|
| `pagination` | `UseApiPaginationReturn<TData>` | ✅ | From `useApiPagination` |
| `columns` | `ColumnDef<TData>[]` | ✅ | TanStack column definitions |
| `searchPlaceholder` | `string` | - | Input placeholder |
| `emptyMessage` | `string` | - | Text shown when table is empty |
| `pageSizeOptions` | `number[]` | - | Rows-per-page selector options |
| `filters` | `React.ReactNode` | - | Extra filter UI in the toolbar |

### `ColumnMeta` type augmentation

The project extends `ColumnMeta` (declared in `apps/web/src/env.d.ts`) with these fields; use them in `meta` on any column definition:

| Field | Type | Effect |
|---|---|---|
| `label` | `string` | Column header label shown in the header and visibility toggle |
| `center` | `boolean` | Centers the column header text |
| `isGrow` | `boolean` | Column stretches to fill remaining width |
| `widthPercentage` | `number` | Sets column width as a % of total table width |

> **Note:** Set `size` (in px) for fixed-width columns (e.g., index `#` or an actions column). Use `meta.isGrow: true` for the primary content column so it fills available space. Columns without `size` or `isGrow` auto-distribute.

### `createColumnHelper` (alternative)

For better type inference in complex columns, prefer `createColumnHelper` from `@tanstack/react-table`:

```tsx
import { createColumnHelper } from "@tanstack/react-table";
import type { UserItem } from "./types";

const col = createColumnHelper<UserItem>();

export const userColumns = [
  col.accessor("name", {
    meta: { label: "Name", isGrow: true },
  }),
  col.display({
    id: "actions",
    size: 60,
    enableSorting: false,
    cell: ({ row }) => <UserActionsCell user={row.original} />,
  }),
];
```

---

## 4. UI Components and Styling

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
