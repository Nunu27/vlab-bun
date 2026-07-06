# @jawit/paginator

## Overview

A powerful and type-safe pagination, filtering, and sorting helper for Drizzle ORM (PostgreSQL) using TypeBox for schema validation.

## Installation

```bash
bun add @jawit/paginator
```

## Key Features

- **Type-Safe Pagination**: Strongly typed pagination request schemas and responses.
- **Dynamic Filtering**: Automatic TypeBox schema generation for filtering and ranging on database columns.
- **Search capabilities**: Full-text or partial search conditions automatically built for specified columns.
- **Sorting**: Easy ascending/descending sorting integration.
- **Seamless Drizzle Integration**: Works directly with Drizzle ORM's relational query builder.

## Usage & API Examples

### 1. Define a Paginator

```typescript
import { createPaginator } from "@jawit/paginator";
import { db } from "./db";

export const userPaginator = createPaginator(db, "users", {
  usableColumns: ["id", "name", "email", "createdAt"],
  searchableColumns: ["name", "email"],
});
```

### 2. Validate Requests

The paginator automatically exposes a TypeBox schema representing valid pagination, filtering, and search inputs for your table.

```typescript
import { Elysia, t } from "elysia";

const app = new Elysia()
  .get("/users", async ({ query }) => {
    return await userPaginator.paginate(query);
  }, {
    query: userPaginator.schema // Automatically validates `page`, `perPage`, `search`, `filters`, `sortBy`, `sortOrder`
  });
```

### 3. Request Format

Clients can request paginated data using complex filters:

```json
{
  "page": 1,
  "perPage": 20,
  "sortBy": "createdAt",
  "sortOrder": "desc",
  "search": "john",
  "filters": [
    {
      "field": "createdAt",
      "op": "between",
      "value": ["2023-01-01T00:00:00Z", "2024-01-01T00:00:00Z"]
    }
  ]
}
```

The response will automatically be shaped as `PaginatedData<T>`:
```json
{
  "items": [...],
  "pageInfo": {
    "page": 1,
    "perPage": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## Development & Scripts

This package is consumed directly from source and has no package-specific build or development scripts.
