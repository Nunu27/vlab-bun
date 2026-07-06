# @jawit/common

## Overview

Common utilities and types for the vLab project. This package provides standard API response wrappers to maintain a consistent structure across the backend and frontend.

## Installation

```bash
bun add @jawit/common
```

## Key Features

- Standardized `success()` and `failure()` response wrappers.
- Pre-defined response helpers for common CRUD operations.
- Strong typing for standard API response formats.

## Usage & API Examples

### Standard Responses

```ts
import { success, failure } from "@jawit/common";

// Success response
const data = success({ data: { user: "nunu27" }, message: "User found" });
// -> { success: true, data: { user: "nunu27" }, message: "User found" }

// Failure response
const err = failure({ message: "Invalid input", errors: ["Email is required"] });
// -> { success: false, message: "Invalid input", errors: ["Email is required"] }
```

### Pre-defined Response Helpers

```ts
import { responses } from "@jawit/common";

responses.notFound("User"); // { success: false, message: "User not found" }
responses.deleted("Lab"); // { success: true, message: "Lab deleted" }
responses.created("Session", { id: 1 }); // { success: true, message: "Session created", data: { id: 1 } }
responses.updated("Node"); // { success: true, message: "Node updated" }
```

## Development & Scripts

This package is consumed directly from source and has no package-specific build or development scripts.
