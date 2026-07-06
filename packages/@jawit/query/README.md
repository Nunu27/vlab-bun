# @jawit/query

## Overview

A seamless integration between Elysia's Eden Treaty (`@elysia/eden`) and TanStack React Query (`@tanstack/react-query`). It proxies your Eden client to directly expose React Query hooks.

## Installation

```bash
bun add @jawit/query
```

## Key Features

- **End-to-End Type Safety**: React Query hooks inherit full type safety from your Elysia backend via Eden Treaty.
- **Automatic Hook Generation**: Automatically exposes `.useQuery()`, `.useMutation()`, `.useInfiniteQuery()`, and more directly on API endpoints.
- **Standardized Error Handling**: Built-in envelope unwrapping for standard `success`/`failure` API responses.
- **Query Cache Management**: Simple wrappers around `queryOptions`, `setQueryData`, and `ensureQueryData`.

## Usage & API Examples

### 1. Setup the Client

Wrap your Eden Treaty client with `treatyQuery`.

```tsx
import { treaty } from "@elysia/eden";
import { treatyQuery } from "@jawit/query";
import type { App } from "backend";

const eden = treaty<App>("http://localhost:3000");
export const api = treatyQuery(eden);
```

### 2. Using React Query Hooks

Instead of importing hooks from `@tanstack/react-query`, call them directly on the proxy!

#### Queries

```tsx
function UserProfile({ id }: { id: string }) {
  // Uses api.users({ id }).get() under the hood
  const { data, isLoading } = api.users({ id }).get.useQuery();

  if (isLoading) return <div>Loading...</div>;
  return <div>{data?.name}</div>;
}
```

#### Mutations

```tsx
function CreateUser() {
  const mutation = api.users.post.useMutation({
    onSuccessMessage: (msg) => toast.success(msg),
    onErrorMessage: (msg) => toast.error(msg),
  });

  return (
    <button onClick={() => mutation.mutate({ name: "Alice" })}>
      Create
    </button>
  );
}
```

#### Pagination / Infinite Queries

```tsx
const { data, fetchNextPage } = api.posts.get.useInfiniteQuery({
  getArgs: (page) => ({ query: { page, perPage: 10 } }),
});
```

#### Cache Management

```tsx
import { useQueryClient } from "@tanstack/react-query";

function MyComponent() {
  const queryClient = useQueryClient();
  
  const invalidateUsers = () => {
    // Easily invalidate routes
    api.users.get.invalidateQuery(queryClient);
  }
}
```

## Development & Scripts

This package is consumed directly from source and has no package-specific build or development scripts.
