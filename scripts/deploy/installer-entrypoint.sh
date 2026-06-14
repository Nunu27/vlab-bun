#!/usr/bin/env bash
# =============================================================================
# vLab Worker Installer Entrypoint
#
# Runs as a Docker Swarm global service task on every node. Since it IS a
# Swarm task, it can use Swarm DNS to resolve service names (manager, guacd).
# It bootstraps the actual vlab-worker as a standalone --privileged container
# and monitors it via `docker wait` so Swarm restarts this installer (and thus
# the worker) whenever the worker exits.
# =============================================================================

set -euo pipefail

WORKER_CONTAINER="${WORKER_CONTAINER:-vlab-worker}"
WORKER_IMAGE="${WORKER_IMAGE:-ghcr.io/nunu27/vlab-bun-worker:latest}"
WORKER_ID="${WORKER_ID:-$(hostname)}"
LOG_LEVEL="${LOG_LEVEL:-info}"
VLAB_NETWORK="vlab-network"
CLAB_MGMT_NETWORK="clab-mgmt"
TOPOLOGIES_VOLUME="vlab-topologies"

log() { echo "[installer] $*"; }
die() { echo "[installer] ERROR: $*" >&2; exit 1; }

# When Swarm stops this installer (SIGTERM on stack rm / node leave),
# also stop and remove the worker so it doesn't linger as an orphan.
cleanup() {
  log "Installer stopping — shutting down worker..."
  docker stop "$WORKER_CONTAINER" 2>/dev/null || true
  docker rm -f "$WORKER_CONTAINER" 2>/dev/null || true
  exit 0
}
trap cleanup SIGTERM SIGINT

# =============================================================================
# 1 — Resolve manager VIP via Swarm DNS
#     This works because worker-installer IS a Swarm service task.
# =============================================================================
log "Resolving manager address..."
MANAGER_IP=""
for i in $(seq 1 12); do
  MANAGER_IP=$(getent hosts manager 2>/dev/null | awk '{print $1}' | head -1 || true)
  if [[ -n "$MANAGER_IP" ]]; then
    log "Manager resolved: $MANAGER_IP"
    break
  fi
  log "Waiting for manager DNS... ($i/12)"
  sleep 5
done
[[ -n "$MANAGER_IP" ]] || die "Could not resolve manager after 60s."
MANAGER_GRPC_URL="${MANAGER_IP}:50051"

# =============================================================================
# 2 — Wait for guacd and discover its IP on clab-mgmt
#     guacd runs mode:global on clab-mgmt — one instance per node.
# =============================================================================
log "Waiting for guacd on $CLAB_MGMT_NETWORK..."
GUACD_IP=""
for i in $(seq 1 24); do
  GUACD_IP=$(docker network inspect "$CLAB_MGMT_NETWORK" 2>/dev/null \
    | grep -A5 '"Name":.*guacd' \
    | grep -oE '"IPv4Address": "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' \
    | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' \
    | head -1 || true)
  if [[ -n "$GUACD_IP" ]]; then
    log "guacd found at $GUACD_IP"
    break
  fi
  log "Waiting for guacd... ($i/24)"
  sleep 5
done
[[ -n "$GUACD_IP" ]] || die "Could not find guacd on $CLAB_MGMT_NETWORK after 120s."

# =============================================================================
# 3 — Ensure the topologies named volume exists
# =============================================================================
log "Ensuring volume $TOPOLOGIES_VOLUME..."
docker volume create "$TOPOLOGIES_VOLUME" >/dev/null 2>&1 || true

# =============================================================================
# 4 — Pull latest worker image
# =============================================================================
log "Pulling $WORKER_IMAGE..."
docker pull "$WORKER_IMAGE"

# =============================================================================
# 5 — Remove any stale worker container from a previous run
# =============================================================================
log "Removing stale worker container (if any)..."
docker rm -f "$WORKER_CONTAINER" 2>/dev/null || true

# =============================================================================
# 6 — Start the worker on clab-mgmt (--privileged lets containerlab write
#     to /proc/sys/net/ipv4/conf/all/rp_filter in its own network namespace)
# =============================================================================
log "Starting worker container..."
docker run -d \
  --name "$WORKER_CONTAINER" \
  --privileged \
  --network "$CLAB_MGMT_NETWORK" \
  -e NODE_ENV=production \
  -e WORKER_ID="$WORKER_ID" \
  -e MANAGER_GRPC_URL="$MANAGER_GRPC_URL" \
  -e GUACD_IP="$GUACD_IP" \
  -e CLAB_CLI_PATH=/app/containerlab \
  -e CLAB_TOPOLOGIES_PATH=/app/lab \
  -e CLAB_MGMT_NETWORK="$CLAB_MGMT_NETWORK" \
  -e LOG_LEVEL="$LOG_LEVEL" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$TOPOLOGIES_VOLUME":/app/lab \
  "$WORKER_IMAGE"

# Connect worker to vlab-network so it can reach the manager VIP
log "Connecting worker to $VLAB_NETWORK..."
docker network connect "$VLAB_NETWORK" "$WORKER_CONTAINER"

log "Worker started. Monitoring (docker wait)..."

# =============================================================================
# 7 — Block until the worker exits. When it does, this process exits too,
#     causing Swarm to restart the installer service task — which restarts
#     the worker. This is the self-healing loop.
# =============================================================================
docker wait "$WORKER_CONTAINER"
log "Worker exited. Installer will restart and relaunch worker."
