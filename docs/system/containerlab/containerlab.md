# Containerlab Integration

vLab's network emulation is built on **[Containerlab](https://containerlab.dev/)**, which orchestrates Docker-based network topologies from a YAML definition. vLab wraps the Containerlab CLI to provide a managed, multi-tenant lab environment across a cluster of Worker hosts.

## `@vlab/clab` — the CLI wrapper

`packages/@vlab/clab` is a thin, typed wrapper around the `containerlab` binary — it does not parse or generate YAML with a custom builder; it defines the topology's TypeScript shape (`ContainerlabTopologyDefinition`, node/link/inspect types in `types.ts`) and serializes it with Bun's built-in `Bun.YAML.stringify`.

The `Containerlab` class (`containerlab.ts`):
- `checkPrerequisites()` — runs `containerlab version`, checks root/SUID/`clab_admins` group membership, and confirms the topologies directory is writable. Run once at Worker boot; the Worker refuses to start if this fails.
- `deploy(id, topology, options)` — writes `<topologiesPath>/<id>/<id>.clab.yml`, then runs `containerlab deploy --topo <path> [flags]`. On failure it automatically destroys the partial deployment before rethrowing, and translates a KVM-related stderr match into a dedicated `ContainerlabKvmRequiredError`.
- `destroy(id, options)` — runs `containerlab destroy --topo <path> --keep-mgmt-net --cleanup [flags]`, then deletes the lab's directory.
- `inspect(id)` — runs `containerlab inspect --topo <path> --format json` and parses the result into `ContainerlabInspectNode[]`.
- `listDeployedIds()` — lists topology directories on disk; used for reconciliation.

All CLI invocations go through `Bun.spawn` (not `execa`/`child_process`), and lab ids are validated against `^[A-Za-z0-9_.-]+$` before being used to build filesystem paths, closing off path-traversal via a crafted session id. Topology files default to `/var/lib/vlab/topologies` (`CLAB_TOPOLOGIES_PATH`).

## Worker Execution (`apps/worker`)

When a lab session starts:

1. The Manager sends the resolved topology (nodes, links, credentials, per-node resource overrides) to the chosen Worker via a `clab:deployLab` gRPC-tunneled RPC.
2. `apps/worker/src/lib/clab.ts` builds a `ContainerlabTopologyDefinition`: kebab-cases node names for containerlab's node keys, tags every node with `vlab.lab.session.id`/`vlab.lab.owner.id` labels (plus `vlab.lab.id`/`vlab.lab.due`/device labels where applicable), injects `USERNAME`/`PASSWORD` env vars for `linux`-kind nodes with credentials, and maps interface pairs to containerlab `endpoints`.
3. **Security hardening is applied at build time, not left to the base image:**
   - `linux`-kind nodes get an `on-exit`/`configure`-stage exec that deletes the default route, adds a route to the Guacamole daemon's IP via `eth0`, forces `nameserver 8.8.8.8`, and **removes/replaces the `shutdown`/`poweroff`/`reboot`/`halt` binaries** with a script that errors — so a student with a terminal inside their own node can't shut it down or otherwise sever Guacamole connectivity.
   - `mikrotik_ros` nodes get a startup config (`/tmp/mikrotik-noreboot.rsc`) that disables the reboot policy for all user groups.
4. `Containerlab.deploy()` writes the YAML and runs `containerlab deploy`, which spins up the containers and wires the veth pairs between them.
5. The Worker strips the `clab-<sessionId>-` container-name prefix and the `/24`-style CIDR suffix from the reported management IP, derives a `health` value from the inspect status, and returns `{id, ip, containerId, health}[]` to the Manager as the RPC response.

**Teardown and crash recovery:** `destroyLab` de-duplicates concurrent destroy calls for the same session (an in-memory map), always stops the session's evaluation first, then calls `Containerlab.destroy()`. On Worker (re)connect, the Manager calls `clab:reconcileSessions` with the list of sessions it still considers active — the Worker destroys any locally-deployed topology *not* on that list, recovering from a Worker crash/restart without manual cleanup.

## Telemetry Monitoring (`@vlab/clab-monitor`)

Once a topology is running, `@vlab/clab-monitor` watches it. **This is fully event-driven, not polled** — the only timer in the package is a 5-second reconnect delay if the Docker event stream itself errors:

- On start (and on each stream reconnect), it does one `docker.listContainers()` sweep to seed current state and emit an initial `node-create` per container.
- It then opens Docker's `/events` stream filtered to `create`/`destroy`/`health_status`, and dispatches to per-action handlers that resolve node identity from container labels, extract the management IP, and (on create / becoming healthy) start interface tracking.
- **Interface monitoring is kind-specific:** Linux containers get a `docker exec ip -o monitor address` process streaming interface changes live; MikroTik containers get a live RouterOS API subscription (`/ip/address/listen`) via `mikro-routeros`.
- Emits four events: `node-create`, `node-remove`, `health-update`, `interface-update`. Also exposes `waitForHealth(id, timeoutMs)` — a promise driven by the same `health-update` stream, not a poll loop.

The Worker (`apps/worker/src/services/monitor.ts`) wires these events to two consumers: it re-emits `health-update`/`interface-update` to the Manager over gRPC as `monitor:node-health`/`monitor:interface-update`, and it feeds `interface-update` into the evaluator as the `node-interface.interfaces-ip` data source — the same live interface state drives both the UI's topology view and the "does this interface have the right IP" check type.

## Security Considerations

Containerlab needs root and Docker-socket access to manipulate network namespaces and iptables — this is the primary reason the Worker exists as a separate, privileged daemon rather than something the Manager does directly. The Manager itself never needs elevated host access.
