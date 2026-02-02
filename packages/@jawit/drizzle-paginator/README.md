# @jawit/drizzle-paginator

A powerful, type-safe pagination and filtering library for [Drizzle ORM](https://orm.drizzle.team/) and [TypeBox](https://github.com/sinclairzx81/typebox).

It automatically generates TypeBox schemas for your API endpoints based on your Drizzle schema, and dynamically translates incoming requests (pagination, sorting, filtering, and searching) into optimized SQL queries.

## Installation

```bash
bun add @jawit/drizzle-paginator drizzle-orm @sinclair/typebox
```

## Usage

### 1. Create a Paginator

Initialize a paginator for a specific table in your schema. You can specify which columns are allowed for sorting/filtering and which columns should be included in global text searches.

```typescript
import { createPaginator } from "@jawit/drizzle-paginator";
import { db } from "./db"; // Your Drizzle DB instance (must have schema defined)

const userPaginator = createPaginator(db, "users", {
	usableColumns: ["id", "name", "email", "createdAt"], // Columns allowed for sorting & filtering
	searchableColumns: ["name", "email"] // Columns to search when `search` query is provided
});
```

### 2. Validate API Requests

The paginator automatically generates a TypeBox schema (`userPaginator.schema`) that you can use directly in your API frameworks (like Elysia, Fastify, etc.) to validate incoming query parameters.

The generated schema expects:
- `page` (number, default: 1)
- `perPage` (number, default: 10)
- `sortBy` (optional string, must be one of `usableColumns`)
- `sortOrder` (optional `"asc" | "desc"`)
- `search` (optional string)
- `filters` (optional array of filter objects)

```typescript
// Example using Elysia
import { Elysia } from "elysia";

const app = new Elysia()
	.get("/users", async ({ query }) => {
		// `query` is automatically validated against userPaginator.schema
		const data = await userPaginator.paginate(query);
		return data;
	}, {
		query: userPaginator.schema
	});
```

### 3. Fetch Paginated Data

Call `.paginate()` with the validated request object. You can optionally pass standard Drizzle `findMany` options (like `with` for relational queries, or additional `where` conditions).

```typescript
const result = await userPaginator.paginate(validatedQuery, {
	// Optional Drizzle query options
	with: {
		profile: true
	},
	where: (users, { eq }) => eq(users.isActive, true) // Additional base conditions
});

/* Result format:
{
	items: [
		{ id: 1, name: "Alice", index: 1, profile: { ... } },
		{ id: 2, name: "Bob", index: 2, profile: { ... } }
	],
	pageInfo: {
		page: 1,
		perPage: 10,
		total: 42,
		totalPages: 5
	}
}
*/
```

## Advanced Filtering

The `filters` array in the request schema supports precise operations depending on the column's data type:

```json
{
	"filters": [
		{ "field": "name", "op": "ilike", "value": "john" },
		{ "field": "createdAt", "op": "gte", "value": "2024-01-01" },
		{ "field": "age", "op": "bt", "value": [18, 30] }
	]
}
```

**Supported Operators (`op`):**
- Strings: `eq`, `ne`, `like`, `ilike`, `nlike`
- Numbers/Dates: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `bt` (between), `nb` (not between)
- Booleans: `eq`, `ne`
