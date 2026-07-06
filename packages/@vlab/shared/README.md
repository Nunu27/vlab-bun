# @vlab/shared

## Overview

Shared utilities, types, enums, and schemas for the vLab monorepo. This package provides core domain definitions and validation schemas used across the Manager, Worker, and Web applications.

## Installation

This package is an internal workspace package. Add it as a workspace dependency:

```json
{
  "dependencies": {
    "@vlab/shared": "workspace:*"
  }
}
```

## Key Features

- **Validation Schemas**: Pre-configured `@sinclair/typebox` and Standard Schema definitions for database models and API payloads (e.g., users, labs, topologies, devices).
- **Core Domain Enums**: Constants and enumerations like `DeviceKind`, `NodeHealth`, and `Role`.
- **Common Utilities**: Shared typescript helpers, command mappings, and standard schemas.

## Usage & API Examples

```ts
import { DeviceKind } from "@vlab/shared/enums";
import { UserSchema } from "@vlab/shared/schemas";

// Use shared enum
const kind = DeviceKind.LINUX;

// Use shared TypeBox schema for validation
import { Value } from "@sinclair/typebox/value";
const isValid = Value.Check(UserSchema, {
  id: "user-1",
  role: "admin",
  // ...
});
```

## Development & Scripts

This package does not define any package-specific scripts in `package.json`. Code checks and type checking are handled globally from the repository root.

Commands:

| Script | Description |
|---|---|
| `bun run check` | Run linter and formatting checks globally |
| `bun run typecheck` | Run TypeScript type checks globally |
