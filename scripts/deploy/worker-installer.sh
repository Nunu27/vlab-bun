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
VLAB_NETWORK="vlab_vlab-network"
CLAB_MGMT_NETWORK="clab-mgmt"
TOPOLOGIES_VOLUME="vlab-topologies"

log() { echo "[installer] $*"; }
die() { echo "[installer] ERROR: $*" >&2; exit 1; }

# When Swarm stops this installer (SIGTERM on stack rm / node leave),
# also stop and remove the standalone containers so they don't linger.
cleanup() {
  log "Installer stopping — shutting down standalone containers..."
  docker stop "$WORKER_CONTAINER" guacd 2>/dev/null || true
  docker rm -f "$WORKER_CONTAINER" guacd 2>/dev/null || true
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
# 2 — Ensure the local bridge network and named volume exist
# =============================================================================
log "Ensuring local bridge network $CLAB_MGMT_NETWORK..."
docker network create -d bridge "$CLAB_MGMT_NETWORK" >/dev/null 2>&1 || true

log "Ensuring volume $TOPOLOGIES_VOLUME..."
docker volume create "$TOPOLOGIES_VOLUME" >/dev/null 2>&1 || true

# =============================================================================
# 3 — Start standalone guacd
#     Attached to both vlab-network (for manager) and clab-mgmt (for lab)
# =============================================================================
log "Starting standalone guacd container..."
docker rm -f guacd 2>/dev/null || true
docker run -d --name guacd \
  --network "$VLAB_NETWORK" \
  guacamole/guacd:1.6.0
docker network connect "$CLAB_MGMT_NETWORK" guacd

# =============================================================================
# 4 — Discover guacd IPs
#     We pass GUACD_VLAB_IP to the worker as GUACD_HOST so the manager connects
#     DIRECTLY to the node-local guacd task IP, bypassing Swarm VIP balancing.
# =============================================================================
log "Discovering guacd IPs..."
GUACD_VLAB_IP=""
GUACD_IP=""

for i in $(seq 1 12); do
  GUACD_VLAB_IP=$(docker network inspect "$VLAB_NETWORK" 2>/dev/null \
    | grep -A5 '"Name": "guacd"' \
    | grep -oE '"IPv4Address": "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' \
    | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' \
    | head -1 || true)
    
  GUACD_IP=$(docker network inspect "$CLAB_MGMT_NETWORK" 2>/dev/null \
    | grep -A5 '"Name": "guacd"' \
    | grep -oE '"IPv4Address": "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' \
    | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' \
    | head -1 || true)
    
  if [[ -n "$GUACD_VLAB_IP" ]] && [[ -n "$GUACD_IP" ]]; then
    log "guacd found: vlab-network=$GUACD_VLAB_IP, clab-mgmt=$GUACD_IP"
    break
  fi
  log "Waiting for guacd network attachment... ($i/12)"
  sleep 5
done
[[ -n "$GUACD_VLAB_IP" ]] || die "Could not find guacd on $VLAB_NETWORK"


# 5 — Pull latest worker image
# =============================================================================
log "Pulling $WORKER_IMAGE..."
docker pull "$WORKER_IMAGE"

# =============================================================================
# 6 — Remove any stale worker container from a previous run
# =============================================================================
log "Removing stale worker container (if any)..."
docker rm -f "$WORKER_CONTAINER" 2>/dev/null || true

# =============================================================================
# 7 — Start the worker on clab-mgmt (--privileged lets containerlab write
#     to /proc/sys/net/ipv4/conf/all/rp_filter in its own network namespace)
# =============================================================================
# 7a — Ensure containerlab detects a container environment inside the worker.
#      With --pid host the worker shares the host PID namespace, so /proc/2
#      inside the worker is the host's kthreadd. containerlab's VerifyVirtSupport
#      sees kthreadd → treats the worker as bare metal → checks /proc/cpuinfo
#      for x86-only vmx/svm flags → always fails on ARM64.
#      We bind-mount a synthetic /proc/2/status that omits "kthreadd", which
#      makes containerlab believe it is in a container and skip the check
#      entirely. This is correct — the worker IS a container. On x86 with real
#      KVM this is a harmless no-op since vrnetlab still detects /dev/kvm
#      independently at runtime.
# =============================================================================
log "Preparing /proc/2/status override for containerlab container detection..."
docker run --rm --privileged -v /:/host alpine \
  sh -c 'mkdir -p /host/var/run/vlab && echo "Name: container_init" > /host/var/run/vlab/proc2-status' 2>/dev/null \
  || log "WARNING: Could not write /var/run/vlab/proc2-status — containerlab KVM check may fail on ARM64."

# =============================================================================
log "Starting worker container..."
docker run -d \
  --name "$WORKER_CONTAINER" \
  --privileged \
  --pid host \
  -v /var/run/vlab/proc2-status:/proc/2/status:ro \
  --network "$CLAB_MGMT_NETWORK" \
  -e NODE_ENV=production \
  -e WORKER_ID="$WORKER_ID" \
  -e MANAGER_GRPC_URL="$MANAGER_GRPC_URL" \
  -e GUACD_HOST="$GUACD_VLAB_IP" \
  -e GUACD_IP="$GUACD_IP" \
  -e CLAB_TOPOLOGIES_PATH=/app/lab \
  -e CLAB_MGMT_NETWORK="$CLAB_MGMT_NETWORK" \
  -e LOG_LEVEL="$LOG_LEVEL" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/run/netns:/var/run/netns \
  -v /etc/hosts:/etc/hosts \
  -v /var/lib/docker/containers:/var/lib/docker/containers \
  -v "$TOPOLOGIES_VOLUME":/app/lab \
  "$WORKER_IMAGE"

# Connect worker to vlab-network so it can reach the manager VIP
log "Connecting worker to $VLAB_NETWORK..."
docker network connect "$VLAB_NETWORK" "$WORKER_CONTAINER"

log "Worker started. Monitoring (docker wait)..."

# =============================================================================
# 8 — Block until the worker exits. `docker wait` runs in the background so
#     bash's `wait` builtin is used instead — unlike a foreground blocking call,
#     `wait` IS interruptible by signals, allowing the SIGTERM trap to fire
#     immediately when Swarm stops this installer task.
# =============================================================================
docker wait "$WORKER_CONTAINER" &
WAIT_PID=$!
wait $WAIT_PID
log "Worker exited. Installer will restart and relaunch worker."
