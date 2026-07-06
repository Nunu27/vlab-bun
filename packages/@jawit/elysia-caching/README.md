# @jawit/elysia-caching

## Overview

A powerful HTTP caching plugin for Elysia.js. It provides robust caching mechanisms including `ETag` and `Last-Modified` support, caching headers, and a customizable caching adapter interface.

## Installation

```bash
bun add @jawit/elysia-caching
```

## Key Features

- **ETag & Last-Modified**: Automatic handling of `If-None-Match` and `If-Modified-Since` headers to return `304 Not Modified`.
- **Customizable Cache Adapter**: Supply your own adapter (e.g., Redis, memory) to store cached data and metadata.
- **Dynamic Caching Strategy**: Apply caching on a per-route basis via macros.
- **Cache Key Manipulation**: Add prefixes and suffixes to cache keys dynamically within request context.

## Usage & API Examples

### 1. Setup the Plugin

```typescript
import { Elysia } from "elysia";
import { createCachingPlugin } from "@jawit/elysia-caching";
// Import or implement a CacheAdapter
import { myRedisAdapter } from "./cache-adapter";

const app = new Elysia()
  .use(createCachingPlugin(myRedisAdapter))
  // ...
```

### 2. Caching Routes

Use the `cached` macro on routes you want to cache.

```typescript
app.get("/users/:id", async ({ params }) => {
  return await db.getUser(params.id);
}, {
  cached: {
    key: "user-profile", // The base cache key
    ttl: 3600, // Time to live in seconds
    useETag: true,
    useLastModified: true
  }
});
```

### 3. Dynamic Cache Keys

You can dynamically construct cache keys during the request using the injected `cache` object.

```typescript
app.get("/posts", async ({ cache, query }) => {
  // Order of calls doesn't matter since the key is assembled at read time,
  // but setting the base key first is a good convention.
  cache.set("all");
  cache.addPrefix("posts");
  cache.addSuffix(`page:${query.page}`);
  
  // The final key will be something like: "posts:all:page:1"
  return await db.getPosts(query.page);
}, {
  cached: { ttl: 600 }
});
```

## Development & Scripts

This package is consumed directly from source and has no package-specific build or development scripts.
