# @vlab/clab-monitor

`@vlab/clab-monitor` is a lightweight Node.js package for monitoring the health and network interfaces of Containerlab (clab) nodes running as Docker containers. It hooks into the Docker Engine's event stream, resolves each container's stable node identity from a single label, and tracks two things per node: container health and internal network interfaces.

It intentionally does **not** track lab sessions, ownership, or any other business-level grouping; callers are expected to resolve any additional labels/metadata they need themselves (e.g. via `containerId` and their own `docker.getContainer(...).inspect()` call) and to own their own lifecycle/cleanup logic.

## 🏗️ Architecture & Underlying System

### Core Components

1. **Monitor Engine (`index.ts`)**: Initializes the Docker event stream, hydrates state by inspecting already-running containers, and maintains the primary `EventEmitter`.
2. **Node Resolver (`types.ts`, `utils.ts`)**: Resolves a container's stable node id from a caller-supplied label (`nodeIdLabel`), alongside the built-in `clab` labels (`clab-node-name`, `clab-node-kind`). A container without all three is ignored.
3. **Container Handlers (`container-handler.ts`)**: React to Docker container events:
   - `create`: Resolves node identity, extracts current interfaces, and starts network monitoring.
   - `destroy`: Stops network monitoring and emits removal.
   - `health_status`: Tracks and broadcasts health check updates.
4. **Network Monitor (`network-monitor/`)**: Tracks internal network interfaces (e.g. `eth0`, `veth1`) of nodes. Since different network OSes expose interfaces differently, it dynamically assigns a handler based on `deviceKind` (e.g. `linux` via `ip a`, or `mikrotik_ros` via the RouterOS API). Device-specific handlers read any credentials they need (e.g. MikroTik's `USERNAME`/`PASSWORD`) directly off the container Containerlab launched, rather than assuming a fixed login.

## 📡 List of Emitted Events

Exactly four events are emitted: nothing else. Initial hydration (on `init()`) is folded into `node-create`: every already-running node matching `nodeIdLabel` is emitted as a `node-create` event before the monitor starts watching for live Docker events.

### `node-create`
- **When**: Emitted for every node found during hydration, and for every new container matching `nodeIdLabel` created afterwards.
- **Payload**: `NodeData` (includes `id`, `name`, `deviceKind`, `ip`, `health`, `containerId`, and initial `interfaces`)

### `node-remove`
- **When**: Emitted when a tracked container is destroyed.
- **Payload**: `id: string`

### `health-update`
- **When**: Emitted when the Docker daemon fires a `health_status` event for a tracked container.
- **Payload**: `{ id: string, health: string | null }`
- **Description**: Network interface extraction/monitoring is deferred until a node reaches the `healthy` state.

### `interface-update`
- **When**: Emitted dynamically by the device-specific `NetworkMonitor` when an internal interface change is detected.
- **Payload**: `{ id: string, interfaces: Record<string, string[]> }`

## 🛠 Usage Overview

```typescript
import { createMonitor } from "@vlab/clab-monitor";
import Docker from "dockerode";
import pino from "pino";

const docker = new Docker();
const logger = pino();

const monitor = createMonitor({
  docker,
  logger,
  nodeIdLabel: "vlab-node-id",
});

const { emitter, init, isNodeHealthy, waitForHealth, nodeInterfaceMap } = monitor;

emitter.on("node-create", (node) => {
  console.log(`Node started: ${node.name} (${node.ip})`);
});

emitter.on("interface-update", (data) => {
  console.log(`Interfaces updated for ${data.id}:`, data.interfaces);
});

// Start listening and emit node-create for already-running nodes
await init();
```
