#!/usr/bin/env bash
# =============================================================================
# vLab Deploy Script
# Usage: curl -fsSL https://raw.githubusercontent.com/nunu27/vlab-bun/main/scripts/deploy.sh | bash
# =============================================================================

set -euo pipefail

REPO_RAW="https://raw.githubusercontent.com/nunu27/vlab-bun/main"
COMPOSE_URL="$REPO_RAW/docker-compose.yml"
STACK_NAME="vlab"
DEFAULT_SETUP_DIR="/opt/vlab"
MIN_DOCKER_VERSION=24

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
  # prompt <VAR_NAME> <label> <default>
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

prompt_secret() {
  # prompt_secret <VAR_NAME> <label> <default>
  local var="$1" label="$2" default="$3"
  local answer
  if [[ -n "$default" ]]; then
    read -rsp "  ${label} [leave blank to keep existing]: " answer
    echo
    answer="${answer:-$default}"
  else
    read -rsp "  ${label}: " answer
    echo
  fi
  printf -v "$var" '%s' "$answer"
}

gen_secret() {
  # Generate a random 32-char alphanumeric secret
  LC_ALL=C tr -dc 'A-Za-z0-9!@#$%^&*' </dev/urandom | head -c 32
}

# Read a value from an existing .env file, returns empty string if not found
read_env() {
  local key="$1" file="$2"
  if [[ -f "$file" ]]; then
    grep -E "^${key}=" "$file" | head -1 | sed "s/^${key}=//" | tr -d '"' || true
  fi
}

# =============================================================================
# STEP 0 — Setup directory
# =============================================================================
echo
echo -e "${BLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
echo -e "${BLD}        vLab Deployment Setup            ${RST}"
echo -e "${BLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
echo

prompt SETUP_DIR "Where should vLab be set up?" "$DEFAULT_SETUP_DIR"

ensure_dir() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    info "Creating directory $dir ..."
    if ! mkdir -p "$dir" 2>/dev/null; then
      warn "Permission denied. Retrying with sudo ..."
      sudo mkdir -p "$dir" || die "Failed to create $dir even with sudo."
      sudo chown "$USER":"$USER" "$dir" || true
    fi
  else
    if [[ ! -w "$dir" ]]; then
      warn "$dir exists but is not writable. Attempting to fix ownership with sudo ..."
      sudo chown "$USER":"$USER" "$dir" || die "Cannot obtain write access to $dir."
    fi
  fi
}

ensure_dir "$SETUP_DIR"
cd "$SETUP_DIR"
success "Working directory: $(pwd)"

# =============================================================================
# STEP 1 — Preflight checks
# =============================================================================
echo
info "Running preflight checks ..."

# OS check
[[ "$(uname -s)" == "Linux" ]] || die "This script only supports Linux."

# Docker
if ! command -v docker &>/dev/null; then
  warn "Docker not found. Installing via get.docker.com ..."
  curl -fsSL https://get.docker.com | sh
  # Add current user to docker group so subsequent commands work without sudo
  if ! groups "$USER" | grep -q '\bdocker\b'; then
    sudo usermod -aG docker "$USER"
    warn "You have been added to the 'docker' group."
    warn "You may need to log out and back in for this to take effect."
    warn "For this session, the script will use 'sudo docker' where needed."
    DOCKER_CMD="sudo docker"
  fi
fi

DOCKER_CMD="${DOCKER_CMD:-docker}"

# Daemon running?
$DOCKER_CMD info &>/dev/null || die "Docker daemon is not running. Start it with: sudo systemctl start docker"

# Version check
DOCKER_VERSION=$($DOCKER_CMD version --format '{{.Server.Version}}' | cut -d. -f1)
if [[ "$DOCKER_VERSION" -lt "$MIN_DOCKER_VERSION" ]]; then
  die "Docker >= ${MIN_DOCKER_VERSION}.x is required (found ${DOCKER_VERSION}.x). Please upgrade."
fi

success "Docker $(${DOCKER_CMD} version --format '{{.Server.Version}}') is ready."

# =============================================================================
# STEP 2 — Swarm check
# =============================================================================
echo
info "Checking Docker Swarm status ..."

SWARM_STATE=$($DOCKER_CMD info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || echo "inactive")

if [[ "$SWARM_STATE" == "active" ]]; then
  success "Swarm is already active."
else
  warn "Swarm is not active on this node."
  # Detect primary non-loopback IP
  DETECTED_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}' | head -1)
  prompt ADVERTISE_IP "Advertise IP for swarm init" "${DETECTED_IP:-}"
  [[ -n "$ADVERTISE_IP" ]] || die "Advertise IP is required to initialize the swarm."
  info "Initializing swarm with advertise-addr $ADVERTISE_IP ..."
  $DOCKER_CMD swarm init --advertise-addr "$ADVERTISE_IP"
  success "Swarm initialized."
  echo
  warn "To add worker nodes, run the following on each worker:"
  $DOCKER_CMD swarm join-token worker
fi

# =============================================================================
# STEP 3 — Collect env
# =============================================================================
echo
MANAGER_ENV_FILE="$SETUP_DIR/.env.manager"
WORKER_ENV_FILE="$SETUP_DIR/.env.worker"

if [[ -f "$MANAGER_ENV_FILE" ]]; then
  info "Existing .env.manager found — using current values as defaults."
else
  info "No .env.manager found — starting fresh configuration."
fi

echo -e "\n${BLD}── Database ─────────────────────────────${RST}"
prompt DATABASE_URL "DATABASE_URL (PostgreSQL)" "$(read_env DATABASE_URL "$MANAGER_ENV_FILE")"

prompt REDIS_URL "REDIS_URL" "$(read_env REDIS_URL "$MANAGER_ENV_FILE")"

echo -e "\n${BLD}── S3 / MinIO ───────────────────────────${RST}"
prompt S3_ENDPOINT   "S3_ENDPOINT"   "$(read_env S3_ENDPOINT "$MANAGER_ENV_FILE")"
prompt S3_ACCESS_KEY "S3_ACCESS_KEY" "$(read_env S3_ACCESS_KEY "$MANAGER_ENV_FILE")"
prompt_secret S3_SECRET_KEY "S3_SECRET_KEY" "$(read_env S3_SECRET_KEY "$MANAGER_ENV_FILE")"

echo -e "\n${BLD}── Auth ─────────────────────────────────${RST}"
prompt BASE_URL     "BASE_URL (public URL, e.g. http://1.2.3.4)" "$(read_env BASE_URL "$MANAGER_ENV_FILE")"
prompt CAS_BASE_URL "CAS_BASE_URL" "$(read_env CAS_BASE_URL "$MANAGER_ENV_FILE" || echo "https://login.pens.ac.id")"

EXISTING_COOKIE_SECRET="$(read_env COOKIE_SECRET "$MANAGER_ENV_FILE")"
if [[ -z "$EXISTING_COOKIE_SECRET" ]]; then
  COOKIE_SECRET="$(gen_secret)"
  info "COOKIE_SECRET auto-generated."
else
  prompt_secret COOKIE_SECRET "COOKIE_SECRET" "$EXISTING_COOKIE_SECRET"
fi

EXISTING_GUACD_SECRET="$(read_env GUACD_SECRET "$MANAGER_ENV_FILE")"
if [[ -z "$EXISTING_GUACD_SECRET" ]]; then
  GUACD_SECRET="$(gen_secret)"
  info "GUACD_SECRET auto-generated."
else
  prompt_secret GUACD_SECRET "GUACD_SECRET" "$EXISTING_GUACD_SECRET"
fi

echo -e "\n${BLD}── Ports & Logging ──────────────────────${RST}"
prompt PORT         "PORT"         "$(read_env PORT "$MANAGER_ENV_FILE" || echo "3000")"
prompt GRPC_PORT    "GRPC_PORT"    "$(read_env GRPC_PORT "$MANAGER_ENV_FILE" || echo "50051")"
prompt DISPLAY_PORT "DISPLAY_PORT" "$(read_env DISPLAY_PORT "$MANAGER_ENV_FILE" || echo "8080")"
prompt LOG_LEVEL    "LOG_LEVEL"    "$(read_env LOG_LEVEL "$MANAGER_ENV_FILE" || echo "info")"

# Write .env.manager
info "Writing .env.manager ..."
cat > "$MANAGER_ENV_FILE" <<EOF
# Generated by vLab deploy script on $(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Database
DATABASE_URL="${DATABASE_URL}"
REDIS_URL="${REDIS_URL}"

# S3 / MinIO
S3_ENDPOINT="${S3_ENDPOINT}"
S3_ACCESS_KEY="${S3_ACCESS_KEY}"
S3_SECRET_KEY="${S3_SECRET_KEY}"

# Auth
BASE_URL="${BASE_URL}"
CAS_BASE_URL="${CAS_BASE_URL}"
COOKIE_SECRET="${COOKIE_SECRET}"

# Guacamole
GUACD_SECRET="${GUACD_SECRET}"

# Ports
PORT="${PORT}"
GRPC_PORT="${GRPC_PORT}"
DISPLAY_PORT="${DISPLAY_PORT}"

# Logging
LOG_LEVEL="${LOG_LEVEL}"
EOF
chmod 600 "$MANAGER_ENV_FILE"
success ".env.manager written."

# Write .env.worker
info "Writing .env.worker ..."
cat > "$WORKER_ENV_FILE" <<EOF
# Generated by vLab deploy script on $(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Logging
LOG_LEVEL="${LOG_LEVEL}"
EOF
chmod 600 "$WORKER_ENV_FILE"
success ".env.worker written."

# =============================================================================
# STEP 3.5 — nginx-proxy configuration (optional)
# =============================================================================
echo
echo -e "\n${BLD}── Reverse Proxy ────────────────────────${RST}"

USE_PROXY=false
PROXY_COMPOSE_FILE=""
PROXY_STATE_FILE="$SETUP_DIR/.proxy-state"

read -rp "  Use nginx-proxy for reverse proxying? [y/N]: " _proxy_answer
if [[ "${_proxy_answer,,}" == "y" ]]; then
  USE_PROXY=true

  info "Note: nginx-proxy will route to PORT=${PORT} (main) and DISPLAY_PORT=${DISPLAY_PORT} (display) internally."

  prompt PROXY_NETWORK    "Proxy network name"               "$(read_env PROXY_NETWORK "$PROXY_STATE_FILE" || echo "nginx-proxy")"
  prompt VIRTUAL_HOST     "Hostname (e.g. vlab.example.com)" "$(read_env VIRTUAL_HOST "$PROXY_STATE_FILE")"
  prompt LETSENCRYPT_EMAIL "LETSENCRYPT_EMAIL"               "$(read_env LETSENCRYPT_EMAIL "$PROXY_STATE_FILE")"

  [[ -n "$VIRTUAL_HOST" ]]     || die "Hostname is required."
  [[ -n "$LETSENCRYPT_EMAIL" ]] || die "LETSENCRYPT_EMAIL is required."

  # Auto-derive
  LETSENCRYPT_HOST="$VIRTUAL_HOST"
  VIRTUAL_HOST_MULTIPORTS="{\"${VIRTUAL_HOST}\":{\"/\":{\"port\":${PORT}},\"/display\":{\"port\":${DISPLAY_PORT},\"dest\":\"/\"}}}"

  # ── Network detection ──────────────────────────────────────────────────────
  NET_DRIVER=$($DOCKER_CMD network inspect "$PROXY_NETWORK" --format '{{.Driver}}' 2>/dev/null || echo "missing")

  if [[ "$NET_DRIVER" == "missing" ]]; then
    warn "Network '$PROXY_NETWORK' does not exist."
    read -rp "  Create it as an attachable overlay? [Y/n]: " _create_net
    if [[ "${_create_net,,}" != "n" ]]; then
      $DOCKER_CMD network create --driver overlay --attachable "$PROXY_NETWORK"
      success "Created overlay network '$PROXY_NETWORK'."
    else
      die "Cannot proceed without a proxy network."
    fi
    echo
    warn "Connect your nginx-proxy and acme-companion containers to this network:"
    echo "  docker network connect ${PROXY_NETWORK} <nginx-proxy-container>"
    echo "  docker network connect ${PROXY_NETWORK} <acme-companion-container>"
    echo
    read -rp "  Press Enter once done (or Ctrl+C to abort) ..."

  elif [[ "$NET_DRIVER" == "bridge" ]]; then
    warn "Network '$PROXY_NETWORK' is a bridge network."
    warn "Swarm services cannot join bridge networks — an attachable overlay is needed."
    NEW_NET="${PROXY_NETWORK}-overlay"
    read -rp "  Create overlay network '${NEW_NET}' and use it instead? [Y/n]: " _migrate
    if [[ "${_migrate,,}" != "n" ]]; then
      $DOCKER_CMD network create --driver overlay --attachable "$NEW_NET"
      success "Created overlay network '$NEW_NET'."
      PROXY_NETWORK="$NEW_NET"
    else
      die "Cannot proceed: bridge network is not compatible with Swarm services."
    fi
    echo
    warn "Connect your nginx-proxy and acme-companion containers to the new network:"
    echo "  docker network connect ${PROXY_NETWORK} <nginx-proxy-container>"
    echo "  docker network connect ${PROXY_NETWORK} <acme-companion-container>"
    echo
    read -rp "  Press Enter once done (or Ctrl+C to abort) ..."

  else
    success "Network '$PROXY_NETWORK' found (driver: ${NET_DRIVER})."
  fi

  # Save proxy state for re-run defaults (separate from .env — never seen by Docker)
  cat > "$PROXY_STATE_FILE" <<STATEEOF
# vLab proxy state — used by deploy.sh for re-run defaults only, not loaded by Docker
PROXY_NETWORK="${PROXY_NETWORK}"
VIRTUAL_HOST="${VIRTUAL_HOST}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL}"
STATEEOF
  chmod 600 "$PROXY_STATE_FILE"

  # Generate docker-compose.proxy.yml
  PROXY_COMPOSE_FILE="$SETUP_DIR/docker-compose.proxy.yml"
  info "Generating docker-compose.proxy.yml ..."
  cat > "$PROXY_COMPOSE_FILE" <<PROXYEOF
version: "3.8"

networks:
  proxy-net:
    external: true
    name: ${PROXY_NETWORK}

services:
  manager:
    ports: []
    networks:
      - vlab-network
      - proxy-net
    environment:
      - VIRTUAL_HOST_MULTIPORTS=${VIRTUAL_HOST_MULTIPORTS}
      - LETSENCRYPT_HOST=${LETSENCRYPT_HOST}
      - LETSENCRYPT_EMAIL=${LETSENCRYPT_EMAIL}
PROXYEOF
  success "docker-compose.proxy.yml generated."
fi

# =============================================================================
# STEP 4 — Fetch docker-compose.yml
# =============================================================================
echo
info "Fetching latest docker-compose.yml from GitHub (main) ..."
curl -fsSL "$COMPOSE_URL" -o "$SETUP_DIR/docker-compose.yml" \
  || die "Failed to download docker-compose.yml from $COMPOSE_URL"
success "docker-compose.yml updated."

# =============================================================================
# STEP 5 — Deploy the stack
# =============================================================================
echo
info "Deploying stack '${STACK_NAME}' ..."
if [[ "$USE_PROXY" == true && -n "$PROXY_COMPOSE_FILE" ]]; then
  $DOCKER_CMD stack deploy \
    -c "$SETUP_DIR/docker-compose.yml" \
    -c "$PROXY_COMPOSE_FILE" \
    "$STACK_NAME"
else
  $DOCKER_CMD stack deploy -c "$SETUP_DIR/docker-compose.yml" "$STACK_NAME"
fi
success "Stack deployment issued."

# =============================================================================
# STEP 6 — Verify
# =============================================================================
echo
info "Waiting for services to start (timeout: 90s) ..."

TIMEOUT=90
INTERVAL=5
ELAPSED=0

while [[ $ELAPSED -lt $TIMEOUT ]]; do
  # Count services where replicas running == replicas desired (e.g. "1/1")
  TOTAL=$($DOCKER_CMD stack services "$STACK_NAME" --format '{{.Replicas}}' 2>/dev/null | wc -l)
  READY=$($DOCKER_CMD stack services "$STACK_NAME" --format '{{.Replicas}}' 2>/dev/null \
    | awk -F'/' '$1 == $2 && $1 != "0"' | wc -l)

  if [[ "$TOTAL" -gt 0 && "$READY" -eq "$TOTAL" ]]; then
    break
  fi

  echo -ne "  ${READY}/${TOTAL} services ready ... (${ELAPSED}s)\r"
  sleep "$INTERVAL"
  ELAPSED=$((ELAPSED + INTERVAL))
done

echo

if [[ "$READY" -eq "$TOTAL" && "$TOTAL" -gt 0 ]]; then
  success "All ${TOTAL} services are running."
else
  warn "Timed out waiting for services. Current status:"
fi

echo
$DOCKER_CMD stack services "$STACK_NAME"

echo
echo -e "${GRN}${BLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
echo -e "${GRN}${BLD}  vLab is deployed!${RST}"
if [[ "$USE_PROXY" == true ]]; then
  echo -e "${GRN}${BLD}  URL: https://${VIRTUAL_HOST}${RST}"
else
  echo -e "${GRN}${BLD}  URL: ${BASE_URL}${RST}"
fi
echo -e "${GRN}${BLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
echo
info "Useful commands:"
echo "  View logs:    docker service logs -f ${STACK_NAME}_manager"
echo "  Status:       docker stack services ${STACK_NAME}"
echo "  Remove stack: docker stack rm ${STACK_NAME}"
echo
