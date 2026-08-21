# Compose (Multi-Host) Deployment

This guide deploys vLab across multiple independent hosts using plain
`docker compose` — no Docker Swarm. Shared state (Postgres, Redis, RustFS)
runs on one infra host; the manager and worker roles run on any number of
other hosts, connected over Tailscale. Every host running the manager role
also runs its own `cloudflared` connector, all attached to the same
Cloudflare Tunnel — Cloudflare's edge load-balances across every registered
connector, so losing one manager host does not take down public access.

## Architecture

```text
Public browser
  → Cloudflare edge
  → one cloudflared connector per manager host, all on the same tunnel
  → that host's manager
  → guacamole-lite
  → the lab's worker's guacd, over Tailscale
  → the lab runtime on that worker

Worker (manager role co-located on the same host)
  → manager, over the local Docker network — no Tailnet hop

Manager
  → Postgres / Redis / RustFS on the infra host, over Tailscale
```

Every manager replica is stateless except for the shared Postgres/Redis/S3
backing it — any replica can serve any browser session, and any replica can
proxy a display session to any worker's guacd, because that routing
information lives in the shared database, not in any one manager's memory.

## Prerequisites

- Tailscale installed on the infra host and every manager/worker host,
  joined to the same tailnet. If a host is new to Tailscale, confirm a
  hypervisor console or LAN recovery path for it **before** installing
  Tailscale and applying any ACLs that could lock it out.
- A Tailnet ACL restricting access to the private ports this deployment
  opens — see "Tailnet ACL" below. Apply this before exposing real traffic;
  a permissive default-allow tailnet policy makes the port bindings below
  meaningless.
- A Cloudflare Tunnel already created, with a token available to paste into
  each manager host's setup.
- Docker installed on every host.

## 1. Deploying infra

Run once, on whichever host will hold Postgres/Redis/RustFS:

```bash
curl -fsSL https://raw.githubusercontent.com/nunu27/vlab-bun/main/scripts/deploy/compose/deploy-infra.sh | bash
```

The script prompts for this host's Tailscale IP (services publish only on
that address, never `0.0.0.0`), database credentials, and RustFS
credentials, then brings up `docker-compose.infra.yml` and prints the
`DATABASE_URL` / `REDIS_URL` / `S3_ENDPOINT` values to paste into every
manager host's setup in the next step.

## 2. Deploying manager and/or worker roles

Run on every host that will act as a manager, a worker, or both:

```bash
curl -fsSL https://raw.githubusercontent.com/nunu27/vlab-bun/main/scripts/deploy/compose/deploy-app.sh | bash
```

The script asks which role(s) to run on this host, then prompts for the
fields that role needs:

- **Manager role**: a unique `MANAGER_ID`, the infra endpoints from step 1,
  `BASE_URL`/`CAS_BASE_URL`, `COOKIE_SECRET`/`GUACD_SECRET`, and a Cloudflare
  Tunnel token. `COOKIE_SECRET` and `GUACD_SECRET` **must be identical
  across every manager replica** — generate them once on the first manager
  host, then paste the same values in on every other manager host. The
  script warns if it looks like it's about to generate a fresh value on a
  host that isn't the first one.
- **Worker role**: a unique `WORKER_ID` and this host's Tailscale IP (used
  as the `guacd` address other managers will connect to — not a LAN/public
  IP, and not a MagicDNS name: the worker container has no Tailscale DNS
  resolver, so a MagicDNS name here won't resolve and the worker will
  crash-loop on startup).

A host can run both roles at once; the worker then reaches its co-located
manager over the local Docker network with no Tailnet hop required. If that
host's manager goes down, that worker cannot deploy or reach labs until an
operator manually points it at another manager's Tailscale endpoint and
restarts the worker container — there is no automatic manager failover for
workers in this deployment mode. Other manager replicas remain fully
functional for their own workers and for all browser traffic in the
meantime.

### Worker-local networking (`clab-mgmt`)

`docker-compose.app.yml` declares a fixed-name `clab-mgmt` Docker network
and creates it up front, rather than letting containerlab create it lazily
on first use. Two things depend on this:

- **Avoiding a startup race.** containerlab creates its management network
  on first deploy and immediately reads the new bridge's IP info via
  netlink; on a freshly-created bridge this can race the kernel before the
  interface settles, failing with `Failed to lookup link ...: Link not
  found`. Pre-creating the network (or adopting it if containerlab already
  made it on an earlier attempt) means containerlab always finds it already
  up.
- **`guacd` needs to be on it.** containerlab attaches every deployed lab
  device to `clab-mgmt`. Without `guacd` also on that network, it has no
  route to any lab device at all, and every console session fails —
  this doesn't show up until someone actually opens a lab display, since
  nothing about the deploy step itself depends on `guacd`.
- **`vlab-worker` needs to be on it too**, alongside the default network
  (for reaching `manager:50051` by service name). The evaluator runs
  inside the worker process and needs direct access to lab node
  containers to run checks against them — it isn't just orchestrating
  them through the Docker socket.

If a fresh worker host still hits the netlink race despite the network
being pre-created (e.g. Compose adopted a broken partial network from a
previous crash), remove it and let Compose recreate it cleanly:
`docker network rm clab-mgmt && docker compose ... up -d`.

### If a worker can't resolve `manager` at all

If `vlab-worker` logs `Name resolution failed for target dns:manager:50051`
(or gRPC connect attempts just hang) even though `manager` is clearly
running and healthy, check whether Docker's embedded DNS (127.0.0.11) is
actually answering: `docker exec <worker> getent hosts manager`. A
`SERVFAIL` there (test it from a disposable container on the same network
too, to rule out anything worker-specific) points at corrupted Docker
daemon networking state on that host, not a compose config problem — this
has been observed after heavy container/network churn on a host (repeated
recreates, leaving Swarm, removing stray networks). `docker compose down`
alone may not clear it if it doesn't fully tear down the project's
networks; verify with `docker network ls` and remove any leftover
`vlab-app_default`/`clab-mgmt` by hand before bringing the stack back up:

```bash
docker compose -f docker-compose.app.yml <env-files> <profiles> down
docker network rm vlab-app_default clab-mgmt 2>/dev/null || true
docker compose -f docker-compose.app.yml <env-files> <profiles> up -d
```

## Tailnet ACL

Restrict access so only tagged manager hosts can reach the private ports
this deployment opens:

```json
{
  "tagOwners": {
    "tag:vlab-manager": ["autogroup:admin"],
    "tag:vlab-worker":  ["autogroup:admin"],
    "tag:vlab-infra":   ["autogroup:admin"]
  },
  "acls": [
    { "action": "accept", "src": ["tag:vlab-manager"], "dst": ["tag:vlab-worker:4822"] },
    { "action": "accept", "src": ["tag:vlab-manager"], "dst": ["tag:vlab-infra:5432", "tag:vlab-infra:6379", "tag:vlab-infra:9000"] }
  ]
}
```

Tag every manager host `tag:vlab-manager`, every worker host
`tag:vlab-worker` (a host can carry both tags), and the infra host
`tag:vlab-infra`. This is a default-deny model once any ACL exists for a
tag — merge it into your tailnet's existing policy rather than replacing it,
and check whether a broad `"src":["*"],"dst":["*:*"]` rule is already
present, since that would make these rules a no-op until scoped down.

## cloudflared ingress

Each manager host's `cloudflared` connector needs ingress rules routing the
public hostname to that host's own manager, split by path since the
manager serves the main app on one port and the Guacamole display websocket
on another:

```yaml
ingress:
  - hostname: <public-hostname>
    path: ^/display(/.*)?$
    service: http://manager:8080
  - hostname: <public-hostname>
    service: http://manager:3000
  - service: http_status:404
```

`http://manager:PORT` only resolves if `cloudflared` runs as a sibling
service in the same `docker-compose.app.yml` project as `manager`, which is
how `deploy-app.sh` deploys it. If `cloudflared` is ever run standalone
outside this compose file, point these at `http://127.0.0.1:PORT` instead.

## Managing the stack

- **Status**: `docker compose -f docker-compose.app.yml ps` /
  `docker compose -f docker-compose.infra.yml ps`
- **Logs**: `docker compose -f docker-compose.app.yml logs -f [service]`
- **Restart a service**: `docker compose -f docker-compose.app.yml restart manager`
- **Stop**: `docker compose -f docker-compose.app.yml down` (preserves
  named volumes — worker topology data and, on the infra host, the
  database/object volumes are untouched)

## Known limitations

- **No backups.** This deployment mode does not include backup/restore
  tooling. Postgres/Redis/RustFS each have exactly one live copy on the
  infra host — a disk failure or an accidental `docker volume rm` there is
  unrecoverable data loss. If you need a recovery path, add one (e.g.
  `pg_dump` plus an off-host copy) before relying on this in production.
- **No automatic gRPC failover for workers.** See "Deploying manager and/or
  worker roles" above.
- **Network dependency.** Manager reachability to Postgres/Redis/RustFS
  depends on Tailscale connectivity to the infra host. If that host sits on
  a different network/provider than the manager/worker hosts, that
  dependency is worth weighing against the isolation it buys you (a
  Proxmox/host failure on the app side no longer touches shared state).
