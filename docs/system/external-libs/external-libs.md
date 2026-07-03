# External Libraries & Integrations

`packages/external/` holds forks of third-party open-source packages that vLab has modified in-place, rather than waiting on upstream PRs. Currently there's one: `mikro-routeros`.

## Mikro-RouterOS (`packages/external/mikro-routeros`)

A fork of a Node.js client for the MikroTik RouterOS API (`RouterOSClient`: `connect()`, `login(username, password)`, `runQuery<T>(cmd, params)`, `stream(cmd, params)`, `close()`). CommonJS, no runtime dependencies beyond Node's own `net`/`EventEmitter`.

- **Our modification:** added `stream()`, a genuine RouterOS API-level `listen` command — it sends the request with `isStream: true` and returns a cancellable `EventEmitter` (`.cancel()` sends `/cancel` for that request's tag), rather than polling. This isn't a workaround; RouterOS itself supports subscribing to live updates on paths like `/ip/route/listen`, `/routing/ospf/neighbor/listen`, or `/ip/address/listen`, and this fork is what lets vLab use that instead of re-querying on a timer.
- **Usage:**
  - `@vlab/clab-monitor`'s `network-monitor/mikrotik_ros.ts` opens a `/ip/address/listen` stream per MikroTik node to track interface changes live.
  - `@vlab/evaluator`'s `mikrotik` handler uses both `.stream()` (live check re-evaluation — routing table, OSPF/RIP/BGP state) and `.runQuery()` (the initial baseline read) for every MikroTik-kind check.
  - Both consumers read the RouterOS API credentials off the container's `USERNAME`/`PASSWORD` env vars (set by the Worker at deploy time — see [Containerlab Integration](../containerlab/containerlab.md)), connecting to port 8728 on the node's management IP.

## Not vendored here: `waycast`

Worth calling out explicitly since it's easy to assume it belongs in this folder: **`waycast`** (the RPC/pub-sub framework underneath both the Manager<->Worker and Manager<->Browser channels) is *not* a fork living in `packages/external`. It's a normal npm dependency pulled from a separate first-party repo (`github.com/Nunu27/waycast`) that the team maintains independently. See [Communication Protocols](../communication/communication.md) for what it actually does.
