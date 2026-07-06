# @vlab/worker

The Worker is the Containerlab host agent daemon for the **vLab** project. It runs on a machine with Docker and containerlab installed, connects outbound to the Manager over gRPC, and acts on its behalf to manage network lab environments.

## Responsibilities

- **Containerlab Management**: Deploys, destroys, and reconciles containerlab lab sessions (`clab:*` RPCs).
- **Docker Interactions**: Pulls images and reports container resource stats (`docker:*` RPCs).
- **Evaluation Engine**: Runs device evaluation checks against deployed nodes (`evaluator:*` RPCs).
- **Real-time Monitoring**: Streams node health and interface state changes back to the manager (`monitor:node-health`, `monitor:interface-update`).
- **Auto-healing**: Automatically restarts nodes that go `unhealthy` in place via `containerlab restart --node` (bounded retries, no polling).
- **Host Metrics**: Reports host CPU, memory, and storage usage periodically.

### Node Identity

The Docker container ID **is** the node ID used throughout the manager (`labSessionNodes.id`), so there is no ID-translation layer.

`@vlab/clab-monitor` emits health and interface events keyed by container ID. This worker resolves the owning lab session ID and containerlab node name for a given container either from the deploy result or, lazily, by inspecting the container's labels (`vlab.lab.session.id`, `vlab.lab.session.node.id`, `clab-node-name`). See `src/services/monitor/node-cache.ts`.

## Core Technologies

- **Runtime**: [Bun](https://bun.sh/)
- **RPC Protocol**: [gRPC](https://grpc.io/)
- **Orchestrator Wrapper**: Containerlab CLI
- **Container runtime**: Docker Engine API

## Key Features

- **Outbound gRPC connection**: Establishes outbound connection to the central Manager API.
- **Dynamic Node Monitoring**: Emits real-time network and container state telemetry.
- **Automated Self-Healing**: Detects unresponsive containers and attempts to recover them.
- **Resource Profiling**: Periodically collects CPU and memory usage statistics for the host machine.

## Directory Structure

- `src/index.ts`: The main entrypoint that starts the worker daemon.
- `src/services/`: Services handling Containerlab logic, Docker event stream monitoring, and local metrics.
- `src/config/`: Configuration setup and environment variable validation.

## Prerequisites & Configuration

### Prerequisites

- **Docker**: Reachable via the default socket (`/var/run/docker.sock`).
- **Containerlab**: [containerlab](https://containerlab.dev/) installed and runnable (either as root, or as a user in the `clab_admins` group).

### Environment Variables

| Variable               | Default                         | Notes                                  |
| ----------------------- | -------------------------------- | --------------------------------------- |
| `NODE_ENV`              | `development`                    |                                          |
| `LOG_LEVEL`             | `info`                            |                                          |
| `WORKER_ID`             | _(required)_                      | Identifies this worker to the manager.  |
| `MANAGER_GRPC_URL`      | `manager:50051`                   | URL to the Manager's gRPC endpoint.     |
| `GUACD_HOST`            | `guacd`                           |                                          |
| `GUACD_IP`              | `""`                              | Set to skip DNS resolution at startup.  |
| `GUACD_PORT`            | `4822`                            |                                          |
| `CLAB_CLI_PATH`         | `containerlab`                    | Path to the containerlab binary.        |
| `CLAB_TOPOLOGIES_PATH`  | `/var/lib/vlab/topologies`        | Must be read/writable.                  |
| `CLAB_MGMT_NETWORK`     | `clab-mgmt`                       |                                          |

## Development & Scripts

The worker operates primarily as a daemon.

| Command | Description |
|---|---|
| `bun run dev` | Start the worker daemon in development mode with hot-reloading (`bun run --watch src/index.ts serve`). |
| `bun run typecheck` | Run TypeScript typechecking. |
| `bun run build` | Compile the worker into a standalone binary at `../../out/worker/app`. |

