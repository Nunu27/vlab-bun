# @vlab/worker

Containerlab host agent. Runs on a machine with Docker + containerlab
installed, connects out to the manager over gRPC, and on its behalf:

- deploys/destroys/reconciles containerlab lab sessions (`clab:*` RPCs)
- pulls images and reports container resource stats (`docker:*` RPCs)
- runs device evaluation checks against deployed nodes (`evaluator:*` RPCs)
- streams node health/interface changes back to the manager
  (`monitor:node-health`, `monitor:interface-update`)
- auto-heals a node that goes `unhealthy` by restarting it in place via
  `containerlab restart --node` (bounded retries, no polling)
- reports host CPU/memory/storage usage periodically

Node identity: the Docker container id **is** the node id used throughout
the manager (`labSessionNodes.id`), so there is no id-translation layer.
`@vlab/clab-monitor` emits health/interface events keyed by container id;
this worker resolves the owning lab session id and containerlab node name for
a given container either from the deploy result or, lazily, by inspecting
the container's labels (`vlab.lab.session.id`, `vlab.lab.session.node.id`,
`clab-node-name`). See `src/services/monitor/node-cache.ts`.

## Prerequisites

- Docker, reachable via the default socket.
- [containerlab](https://containerlab.dev/) installed and runnable (root, or
  the user in the `clab_admins` group).

## Environment

| Variable               | Default                         | Notes                                  |
| ----------------------- | -------------------------------- | --------------------------------------- |
| `NODE_ENV`              | `development`                    |                                          |
| `LOG_LEVEL`             | `info`                            |                                          |
| `WORKER_ID`             | _(required)_                      | Identifies this worker to the manager.  |
| `MANAGER_GRPC_URL`      | `manager:50051`                   |                                          |
| `GUACD_HOST`            | `guacd`                           |                                          |
| `GUACD_IP`              | _(resolved from `GUACD_HOST`)_    | Set to skip DNS resolution at startup.  |
| `GUACD_PORT`            | `4822`                            |                                          |
| `CLAB_CLI_PATH`         | `containerlab`                    |                                          |
| `CLAB_TOPOLOGIES_PATH`  | `/var/lib/vlab/topologies`        | Must be read/writable.                  |
| `CLAB_MGMT_NETWORK`     | `clab-mgmt`                       |                                          |

## Development

```bash
bun install
bun run dev       # bun worker dev, from the repo root
bun run typecheck
bun run build     # compiled binary, see package.json
```
