# @jawit/query

A TanStack Query wrapper for [Elysia Eden Treaty](https://elysiajs.com/eden/overview.html). It adds `useQuery`, `useMutation`, `useInfiniteQuery`, and more to every route in your Eden client with strong type safety and automatic response unwrapping.

## Installation

```bash
bun add @tanstack/react-query # required peer dependency
bun add @jawit/query
```

## Usage

```ts
import { treaty } from "@elysiajs/eden";
import { treatyQuery } from "@jawit/query";
import type { App } from "your-api-package";

// 1. Create your standard Eden client
const eden = treaty<App>("http://localhost:3000");

// 2. Wrap it with treatyQuery
export const client = treatyQuery(eden, {
  onSuccessMessage: (msg) => toast.success(msg),
  onErrorMessage: (msg) => toast.error(msg),
});

// 3. Use hooks anywhere!
function MyComponent() {
  const { data, isLoading } = client.users.get.useQuery({
    args: { query: { active: true } }
  });

  const { mutate } = client.users.post.useMutation({
     // local overrides are supported
    onSuccessMessage: (msg) => console.log("Specific success:", msg)
  });

  return (
    <button onClick={() => mutate({ name: "New User" })}>
      Create User
    </button>
  );
}
```

## Infinite Query

Infinite queries are pre-configured for `PaginatedData`. The `getNextPageParam` automatically uses the `pageInfo` object. You must provide a function for `args` to define how the page parameter is injected:

```ts
const { fetchNextPage, hasNextPage } = client.posts.index.useInfiniteQuery({
  args: (page) => ({ $query: { page, perPage: 10 } })
});
```
