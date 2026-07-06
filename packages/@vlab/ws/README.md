# @vlab/ws

## Overview

WebSocket / Waycast routes and schemas for real-time communication between the vLab Web frontend and Manager backend. It defines the real-time API using `waycast` and `@sinclair/typebox` to provide end-to-end type safety over WebSockets.

## Installation

This package is an internal workspace package. Add it as a workspace dependency:

```json
{
  "dependencies": {
    "@vlab/ws": "workspace:*"
  }
}
```

## Key Features

- **Modular Routers**: Combines admin, device template, lab, and lab session routers into a unified `AppRouter`.
- **E2E Type Safety**: Provides full TypeScript inference for frontend queries, mutations, and subscriptions over WebSocket.
- **Type Extractors**: Exposes helper types like `WSDataOf`, `WSRpcPayloadOf`, and `WSRpcResponseOf` to standardise WebSocket contract parsing.

## Usage & API Examples

```ts
import { AppRouter } from "@vlab/ws";

// The AppRouter defines the waycast interface for WebSockets:
const client = AppRouter.createClient({
  socketUrl: "ws://localhost:3000/ws",
});

// Subscribe to real-time events, such as node health updates
client.subscribe("monitor:node-health", (healthUpdate) => {
  console.log(`Node ${healthUpdate.nodeId} health changed to ${healthUpdate.status}`);
});
```

## Development & Scripts

This package does not define any package-specific scripts in `package.json`. Checks and tests are run globally from the repository root.

Commands:

| Script | Description |
|---|---|
| `bun run check` | Run linter and formatting checks globally |
| `bun run typecheck` | Run TypeScript type checks globally |
