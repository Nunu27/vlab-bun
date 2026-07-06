# `@vlab/clab` — Containerlab CLI Wrapper

`packages/@vlab/clab` is a thin, typed wrapper around the [`containerlab`](https://containerlab.dev/) CLI. It has **no third-party wrapper dependencies** — just `Bun.spawn` and `Bun.YAML`. It is consumed by [`apps/worker`](worker.md) (`domain/lab/deploy.ts`, `destroy.ts`, `reconcile.ts`) and by `tests/evaluator-e2e`.

## Files

```
packages/@vlab/clab/src/
  containerlab.ts   Containerlab class: ready/checkPrerequisites/deploy/redeployNode/destroy/listDeployedIds/inspect
  args.ts           CLI flag builders for deploy/destroy
  command-runner.ts Bun.spawn-based process runner returning {exitCode, stdout, stderr}
  errors.ts         ContainerlabCliNotFoundError / ContainerlabCommandError / ContainerlabKvmRequiredError / InvalidLabIdError
  inspect.ts        parses `containerlab inspect --format json`-shaped stdout into ContainerlabInspectNode[]
  lab-id.ts         validateLabId() - path-traversal-safe ID validation (used as directory name)
  types.ts          full typed containerlab topology schema (nodes/links/mgmt/etc.) + ContainerlabInspectNode
  index.ts          barrel export (default export = Containerlab class)
```

## `Containerlab` class (`containerlab.ts`)

Constructed with `{ cliPath, topologiesPath }` (from worker env vars). Public methods:

- **`ready()`** — one-time `containerlab version` probe; memoized so repeated calls don't re-shell-out.
- **`checkPrerequisites()`** — confirms `containerlab version` runs; resolves the CLI's real path (`Bun.which`) and requires the process to be root, the binary to be SUID-root, or the current user to be in the `clab_admins` group (via a `groups` shell-out) — otherwise throws with an actionable `chown root:root ... && chmod u+s ...` remediation message. Also ensures `topologiesPath` exists and is read/write accessible. Called once at worker boot (`server.ts`).
- **`deploy(id, topology)`**:
  1. Calls `ready()`.
  2. Writes the generated YAML to `<topologiesPath>/<id>/<id>.clab.yml` (`Bun.YAML.stringify`, forcing `name: id`).
  3. Runs `containerlab deploy --topo <path> [...flags]`.
  4. **On any deploy failure, automatically calls `destroy(id)`** to clean up partially-deployed containers before re-throwing.
  5. If stderr matches a KVM-required pattern, it's translated into a friendlier `ContainerlabKvmRequiredError`.
  6. On success, returns `this.inspect(id)` output.
- **`redeployNode(id, nodeName)`** — runs `containerlab restart --topo <path> --node <nodeName>` (**in-place restart, not full redeploy** — this preserves the container's ID, unlike a redeploy which would recreate it), then re-inspects and returns fresh node info. This is what [`@vlab/clab-monitor`'s auto-heal](clab-monitor.md#auto-heal-appsworkersrcservicesmonitorhealt) calls when a node goes unhealthy.
- **`destroy(id)`** — always passes `--keep-mgmt-net --cleanup` (plus any `graceful`/`nodeFilter` flags), then `rm -rf`s the wrapper-owned lab directory (`<topologiesPath>/<id>`).
- **`listDeployedIds()`** — lists subdirectories under `topologiesPath` (i.e. every lab this worker currently believes is deployed on disk). Used by `apps/worker`'s `clab:reconcileSessions` handler to detect drift against the manager's view.
- **`inspect(id)`** — runs `containerlab inspect --topo <path> --details`, JSON-parsed by `inspect.ts` into `ContainerlabInspectNode[]` (per-node `containerId`, `name`, `ipv4Address` (CIDR), `status` (health string extracted from the Docker "State" suffix), etc.).

## Command execution primitive (`command-runner.ts`)

Every containerlab invocation goes through `Bun.spawn([cliPath, ...args], {stdout:"pipe", stderr:"pipe"})`; a non-zero exit code throws `ContainerlabCommandError` with captured stdout/stderr attached.

## Lab ID safety (`lab-id.ts`)

`validateLabId()` rejects empty/`.`/`..`/path-separator/null-byte IDs and enforces `^[A-Za-z0-9_.-]+$` before the ID is ever used as a directory name — defends the topology directory against path traversal from a compromised/buggy session ID. Every public method above validates its `id` argument through this function first.

## Types (`types.ts`)

The full typed contract with the containerlab CLI/YAML format:

- `ContainerlabTopologyDefinition` / `ContainerlabNodeDefinition` — the YAML structure written to `<id>.clab.yml`.
- `ContainerlabLinkDefinition` — a union of veth/mgmt-net/host/macvlan/vxlan/generic link shapes.
- `ContainerlabInspectNode` — the parsed shape of `containerlab inspect --details` JSON output.

## Errors (`errors.ts`)

| Error                          | Thrown when                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `ContainerlabCliNotFoundError` | The `containerlab` binary can't be resolved on `PATH`.                                               |
| `ContainerlabCommandError`     | Any containerlab CLI invocation exits non-zero; carries captured stdout/stderr.                      |
| `ContainerlabKvmRequiredError` | Deploy stderr matches a KVM-required pattern (some node kinds, e.g. VM-based ones, need `/dev/kvm`). |
| `InvalidLabIdError`            | A lab/session ID fails `validateLabId()`'s safety checks.                                            |

## Interaction with `@vlab/clab-monitor`

`@vlab/clab` only shells out to the CLI and parses its output — it has no awareness of live container health or Docker events. That's the responsibility of the sibling package, [`@vlab/clab-monitor`](clab-monitor.md), which watches the Docker event stream independently. The two are stitched together in `apps/worker`: [`domain/lab/deploy.ts`](worker.md#deploy-domainlabdeployts) normalizes `clab`'s inspect-derived health string through clab-monitor's `formatHealth()`, and [`services/monitor/heal.ts`](clab-monitor.md#auto-heal-appsworkersrcservicesmonitorhealt) calls `clab.redeployNode()` when clab-monitor reports a node unhealthy.
