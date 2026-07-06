# @vlab/clab-monitor

## Overview

A real-time Docker container and network interface monitor for [Containerlab](https://containerlab.dev/) topologies. It subscribes to Docker events, tracks node health state transitions, and maintains a live map of per-node IP addresses — with automatic reconnection and per-node event serialisation.

## Installation

This package is an internal workspace package. Add it as a workspace dependency:

```json
{
  "dependencies": {
    "@vlab/clab-monitor": "workspace:*"
  }
}
```

Peer dependencies that must be installed in the consuming app:

| Peer | Version |
|------|---------|
| `dockerode` | `^5.0.0` |
| `mikro-routeros` | `workspace:*` |
| `typescript` | `^6.0.3` |

## Key Features

- **Docker event streaming** — subscribes to `start`, `health_status`, `kill`, `die`, and `destroy` events filtered to container type.
- **Health tracking** — maps Docker health states (`starting`, `healthy`, `unhealthy`) and lifecycle events (`died`, `destroyed`) to a typed `NodeHealth` value.
- **`waitForHealth`** — promise-based helper that resolves when a node becomes healthy, with optional timeout and `AbortSignal` support.
- **Live interface maps** — reads and streams IP address changes per node. Emits an `interface-update` event on every change.
- **Per-kind network monitors** — pluggable handlers for `linux` (via `ip monitor`) and `mikrotik_ros` (via RouterOS API streams).
- **Auto-reconnect** — if the Docker event stream drops, the monitor rehydrates all running containers and reconnects automatically (default 3 s back-off).
- **Serialised per-node processing** — a `KeyedQueue` ensures Docker events for the same node are handled one at a time, preventing race conditions.

## Usage & API Examples

```ts
import Dockerode from "dockerode";
import { createMonitor } from "@vlab/clab-monitor";

const docker = new Dockerode({ socketPath: "/var/run/docker.sock" });

const { monitor, emitter, nodes, interfaceMap, waitForHealth } = createMonitor({
  docker,
  logger: console, // optional; any { info, error, debug, warn } object
});

// Listen for health changes
emitter.on("health-update", ({ id, health }) => {
  console.log(`Node ${id} is now: ${health}`);
});

// Listen for interface changes
emitter.on("interface-update", ({ id, interfaces }) => {
  console.log(`Node ${id} interfaces:`, interfaces);
  // e.g. { eth0: ["192.168.1.1/24"], eth1: ["10.0.0.1/30"] }
});

// Start the monitor (connects to Docker, rehydrates existing containers)
await monitor.start();

// Wait for a specific node to become healthy
try {
  await waitForHealth("abc123containerid", { timeout: 30_000 });
  console.log("Node is healthy!");
} catch (err) {
  console.error("Node did not become healthy in time:", err);
}

// Stop the monitor cleanly
await monitor.stop();
```

### API Reference

#### `createMonitor(options)`

Creates a monitor instance.

```ts
function createMonitor(options: {
  docker: Dockerode;
  logger?: Pick<typeof console, "info" | "error" | "debug" | "warn">;
}): MonitorInstance
```

Returns a `MonitorInstance` object:

| Property | Type | Description |
|----------|------|-------------|
| `monitor` | `{ start(): Promise<void>; stop(): Promise<void> }` | Starts/stops the Docker event stream and network monitors. |
| `emitter` | `EventEmitter<Events>` | Typed event emitter (see [Events](#events)). |
| `nodes` | `Set<string>` | Container IDs currently being tracked (have a management IP and Containerlab labels). |
| `interfaceMap` | `Map<string, NodeInterfaces>` | Live snapshot of `{ ifaceName: string[] }` per node ID. |
| `waitForHealth` | `(id, options?) => Promise<void>` | Resolves when the node reaches a healthy state (see below). |

#### `waitForHealth(id, options?)`

```ts
waitForHealth(
  id: string,
  options?: {
    timeout?: number;   // ms; 0 or omitted = wait forever
    signal?: AbortSignal;
  }
): Promise<void>
```

- Resolves immediately if the node is already in a healthy state.
- Rejects with a timeout error if `timeout` elapses before the node becomes healthy.
- Rejects if the node enters a terminal state (`unhealthy`, `died`, `destroyed`).
- Rejects with `signal.reason` if the provided `AbortSignal` is aborted.
- Throws synchronously if `id` is not in the monitored `nodes` set.

#### Events

```ts
interface Events {
  "health-update":    [{ id: string; health: NodeHealth }];
  "interface-update": [{ id: string; interfaces: NodeInterfaces }];
}
```

##### `NodeHealth`

```ts
type NodeHealth =
  | "starting"    // container is starting up
  | "healthy"     // Docker healthcheck passed (or no healthcheck configured)
  | "unhealthy"   // Docker healthcheck failed
  | "died"        // container process exited
  | "destroyed"   // container was removed
  | null;         // unknown / not yet determined
```

##### `NodeInterfaces`

```ts
type NodeInterfaces = Record<string, string[]>;
// e.g. { "eth0": ["192.168.1.1/24"], "eth1": ["10.0.0.1/30"] }
```

### Architecture

```
createMonitor()
├── createDockerEventMonitor()          (src/container/index.ts)
│   ├── rehydrate()                     — enumerates running containers on (re)connect
│   ├── Docker event stream             — start | health_status | kill | die | destroy
│   ├── handlers (src/container/handlers.ts)
│   │   ├── start        → add node, emit health-update, start network monitor
│   │   ├── health_status→ emit health-update
│   │   ├── kill         → remove node, stop network monitor
│   │   ├── die          → emit health-update("died")
│   │   └── destroy      → emit health-update("destroyed")
│   └── KeyedQueue       — serialises per-node event processing
└── network monitor (src/network/index.ts)
    ├── linux            (src/network/linux.ts)     — ip addr + ip monitor
    └── mikrotik_ros     (src/network/mikrotik_ros.ts) — RouterOS API /ip/address
```

#### Node Discovery

A container is tracked only when it has **both** Containerlab labels:

| Label | Key |
|-------|-----|
| Node kind | `clab-node-kind` |
| Lab name  | `containerlab` |

The management IP is resolved from the container's network settings. Priority order:

1. A network whose name contains `clab`
2. A network named `bridge` or `management`
3. Any network with a non-empty `IPAddress`

#### Credentials

Per-node credentials are extracted from the container's environment variables:

| Env var | Maps to |
|---------|---------|
| `USERNAME` | `NodeCredentials.username` |
| `PASSWORD` | `NodeCredentials.password` |

Defaults (`admin` / `admin`) are applied when not set (MikroTik only).

#### Network Monitors

##### `linux`

Uses `docker exec` to run:

- `ip -j addr` — one-shot read of all interfaces at startup.
- `ip -o monitor address` — long-running stream; parses `Deleted` lines to handle address removal. Skips the loopback (`lo`) interface.

##### `mikrotik_ros`

Connects to the RouterOS API (`mikro-routeros`) on port **8728**:

- `/ip/address/print` — reads the current address table.
- `/ip/address/listen` — streams address additions/deletions. Uses RouterOS entry `.id` values to match updates to previous entries.

### Health State Machine

```
           start event
              │
         ┌────▼────┐
         │ starting│◄──── health_status: starting
         └────┬────┘
              │ health_status: healthy
         ┌────▼────┐
         │ healthy │◄──── health_status: healthy
         └────┬────┘
   ┌──────────┼──────────┐
   │          │          │
kill       die event  health_status: unhealthy
   │          │          │
   │    ┌─────▼───┐  ┌───▼──────┐
   │    │  died   │  │unhealthy │
   │    └─────┬───┘  └──────────┘
   │          │ destroy event
   │    ┌─────▼──────┐
   └───►│  destroyed │
        └────────────┘
```

`HEALTHY_STATUS` = `{ "healthy", null }`  
`TERMINAL_HEALTH_STATUS` = `{ "unhealthy", "died", "destroyed" }`

### Exec Utilities (`src/exec.ts`)

Low-level helpers for running commands inside containers via `docker exec`:

| Function | Description |
|----------|-------------|
| `execStream(docker, container, cmd)` | Returns a demuxed `PassThrough` stream of stdout. |
| `execOutput(docker, container, cmd)` | Collects all stdout and returns it as a `string`. |
| `execLines(docker, container, cmd, onLine, onError?)` | Calls `onLine` for each newline-delimited output line. Returns the underlying stream. |

### `KeyedQueue`

A per-key FIFO queue (`src/container/utils.ts`) that serialises async tasks by a string key. Used to ensure Docker events for the same container ID are processed sequentially:

```ts
const queue = new KeyedQueue({ logger });

queue.enqueue(containerId, handlerFn, ctx, event, node);
```

Public methods: `enqueue`, `has`, `size`, `clear`, `clearAll`.

## Development & Scripts

This package does not define any package-specific scripts. Code checking, formatting, and testing are orchestrated from the repository root.

Commands:

| Script | Description |
|---|---|
| `bun run check` | Run linter and formatting checks globally |
| `bun run typecheck` | Run TypeScript type checks globally |
