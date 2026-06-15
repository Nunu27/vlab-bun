# @jawit/query

A TanStack Query wrapper for [Elysia Eden Treaty](https://elysiajs.com/eden/overview.html). It adds `useQuery`, `useMutation`, `useInfiniteQuery`, and more to every route in your Eden client with strong type safety, automatic response unwrapping, and automatic query key generation.

## Installation

```bash
bun add @tanstack/react-query # required peer dependency
bun add @jawit/query
```

## Setup

First, create your Eden client and wrap it with `treatyQuery`.

```ts
import { treaty } from "@elysia/eden";
import { treatyQuery } from "@jawit/query";
import type { App } from "your-api-package";

// 1. Create your standard Eden client
const eden = treaty<App>("http://localhost:3000");

// 2. Wrap it with treatyQuery
export const client = treatyQuery(eden, {
  // Optional default handlers for success/error messages
  onSuccessMessage: (msg) => toast.success(msg),
  onErrorMessage: (msg) => toast.error(msg),
});
```

## How Query Keys Are Generated (Important)

`@jawit/query` uses an ES6 `Proxy` to automatically generate TanStack Query keys based on the API route path you are accessing, plus the arguments you pass to it. You **do not** need to manually define or manage query keys.

When you chain properties on the `client`, the proxy tracks the path segments in an array. When you invoke a query hook (like `useQuery`), the accumulated path segments are combined with your `args` to form the final `queryKey`.

### Examples of Key Generation

| Eden Query Call | Generated `queryKey` |
| --- | --- |
| `client.users.get.useQuery()` | `["users", "get", undefined]` |
| `client.users.get.useQuery({ args: { query: { active: true } } })` | `["users", "get", { query: { active: true } }]` |
| `client.posts({ id: 5 }).get.useQuery()` | `["posts", { id: 5 }, "get", undefined]` |
| `client.admin.settings.get.useQuery()` | `["admin", "settings", "get", undefined]` |

This automatic key generation ensures your TanStack cache is always consistent and deterministic based on the exact endpoint and parameters used.

## Usage

### `useQuery`

```tsx
function UsersList() {
  const { data, isLoading } = client.users.get.useQuery({
    args: { query: { active: true } }
  });

  if (isLoading) return <div>Loading...</div>;

  // `data` is automatically unwrapped from Eden's response object!
  return <div>{JSON.stringify(data)}</div>;
}
```

### `useMutation`

```tsx
function CreateUser() {
  const { mutate } = client.users.post.useMutation({
    // local overrides for callbacks are supported
    onSuccessMessage: (msg) => console.log("Specific success:", msg)
  });

  return (
    <button onClick={() => mutate({ name: "New User" })}>
      Create User
    </button>
  );
}
```

### `useInfiniteQuery`

Infinite queries are pre-configured to work well with paginated endpoints. You must provide a `getArgs` function to define how the `pageParam` is injected into your endpoint's arguments.

```tsx
function PostsList() {
  const { data, fetchNextPage, hasNextPage } = client.posts.index.useInfiniteQuery({
    getArgs: (page) => ({ query: { page, perPage: 10 } })
  });
  
  // `getNextPageParam` is handled automatically if the API returns a `pageInfo` object
  // containing `page` and `totalPages` properties.
}
```

### Query Client Utilities

You can also interact directly with the query cache using the automatically generated keys via helper functions on the proxy:

```ts
import { useQueryClient } from "@tanstack/react-query";

function MyComponent() {
  const queryClient = useQueryClient();

  // Invalidate queries without knowing the exact key array!
  const invalidateUsers = () => {
    // Invalidates query keys starting with ["users", "get"]
    client.users.get.invalidateQuery(queryClient);
  };

  // Optimistic updates
  const setUsers = () => {
    // Sets query data for the exact key ["users", "get", { query: { active: true } }]
    client.users.get.setQueryData(queryClient, newUsersData, { query: { active: true } });
  };
  
  // Prefetching / ensuring data
  const prefetchUsers = async () => {
    await client.users.get.ensureQueryData(queryClient, { query: { active: true } });
  }
}
```

## Features

- **Type-safe Hooks**: Full TypeScript inference directly from your Elysia backend.
- **Auto Unwrapping**: Eden normally returns `{ data, error }`. This wrapper automatically throws `error` (which React Query catches) and returns `data` directly.
- **Global Error Handling**: Configure global `onErrorMessage` and `onSuccessMessage` callbacks during setup.
- **Zero Config Keys**: Query keys are handled automatically based on the endpoint path and arguments.
