#!/usr/bin/env bash
# =============================================================================
# vLab Deploy Script (Manual Worker Setup)
# =============================================================================

set -euo pipefail

DEFAULT_SETUP_DIR="/opt/vlab/worker"

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[1;33m'
BLU='\033[0;34m'
BLD='\033[1m'
RST='\033[0m'

info()    { echo -e "${BLU}${BLD}[*]${RST} $*"; }
success() { echo -e "${GRN}${BLD}[✓]${RST} $*"; }
warn()    { echo -e "${YLW}${BLD}[!]${RST} $*"; }
error()   { echo -e "${RED}${BLD}[✗]${RST} $*" >&2; }
die()     { error "$*"; exit 1; }

prompt() {
  local var="$1" label="$2" default="$3"
  local answer
  if [[ -n "$default" ]]; then
    read -rp "  ${label} [${default}]: " answer
    answer="${answer:-$default}"
  else
    read -rp "  ${label}: " answer
  fi
  printf -v "$var" '%s' "$answer"
}

read_env() {
  local key="$1" file="$2"
  if [[ -f "$file" ]]; then
    grep -E "^${key}=" "$file" | head -1 | sed "s/^${key}=//" | tr -d '"' || true
  fi
}

echo
echo -e "${BLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
echo -e "${BLD}       vLab Worker Manual Setup          ${RST}"
echo -e "${BLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
echo

prompt SETUP_DIR "Where should the Worker be set up?" "$DEFAULT_SETUP_DIR"

if [[ ! -d "$SETUP_DIR" ]]; then
  info "Creating directory $SETUP_DIR ..."
  sudo mkdir -p "$SETUP_DIR" || die "Failed to create $SETUP_DIR"
  sudo chown "$USER":"$USER" "$SETUP_DIR" || true
fi

cd "$SETUP_DIR"
success "Working directory: $(pwd)"

echo
info "Checking Docker..."
DOCKER_CMD="${DOCKER_CMD:-docker}"
if ! command -v "$DOCKER_CMD" &>/dev/null; then
  die "Docker is not installed."
fi

# Ensure clab-mgmt exists for guacd and labs
$DOCKER_CMD network create clab-mgmt 2>/dev/null || true

WORKER_ENV_FILE="$SETUP_DIR/.env.worker"

echo -e "\n${BLD}── Connection to Manager ────────────────${RST}"
prompt MANAGER_GRPC_URL "MANAGER_GRPC_URL" "$(read_env MANAGER_GRPC_URL "$WORKER_ENV_FILE" || echo "http://<manager-ip>:50051")"

echo -e "\n${BLD}── Guacd Public Addressing ──────────────${RST}"
DETECTED_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}' | head -1)
warn "This is the IP that the Manager will use to route web-console traffic to this worker's guacd instance."
prompt GUACD_HOST "GUACD_HOST" "$(read_env GUACD_HOST "$WORKER_ENV_FILE" || echo "${DETECTED_IP:-}")"

cat > "$WORKER_ENV_FILE" <<EOF
LOG_LEVEL=info
WORKER_ID=manual-worker-$(hostname)
MANAGER_GRPC_URL=${MANAGER_GRPC_URL}
CLAB_CLI_PATH=/app/containerlab
CLAB_TOPOLOGIES_PATH=/app/lab
GUACD_HOST=${GUACD_HOST}
GUACD_PORT=4822
EOF

success "Saved $WORKER_ENV_FILE"

echo
info "Stopping any existing manual worker/guacd containers..."
$DOCKER_CMD rm -f vlab-worker vlab-guacd 2>/dev/null || true

info "Starting vLab Guacd..."
$DOCKER_CMD run -d \
  --name vlab-guacd \
  --network clab-mgmt \
  -p 4822:4822 \
  --restart unless-stopped \
  linuxserver/guacd:latest >/dev/null

info "Starting vLab Worker..."
KVM_FLAG=""
if [ -e /dev/kvm ]; then
  KVM_FLAG="--device /dev/kvm"
else
  warn "KVM (/dev/kvm) not found — VM-based nodes (e.g. mikrotik_ros) will not work on this host."
fi

$DOCKER_CMD run -d \
  --name vlab-worker \
  --privileged \
  --pid host \
  --network clab-mgmt \
  --env-file "$WORKER_ENV_FILE" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/run/docker/netns:/var/run/docker/netns:ro \
  -v vlab-topologies:/app/lab \
  $KVM_FLAG \
  --restart unless-stopped \
  ghcr.io/nunu27/vlab-bun-worker:latest >/dev/null

echo
success "vLab Worker & Guacd deployed!"
echo "  View worker logs:   docker logs -f vlab-worker"
echo "  View guacd logs:    docker logs -f vlab-guacd"
echo
