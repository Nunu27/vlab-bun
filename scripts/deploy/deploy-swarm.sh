#!/usr/bin/env bash
# =============================================================================
# vLab Deploy Script (Swarm All-in-One)
# Usage: curl -fsSL https://raw.githubusercontent.com/nunu27/vlab-bun/main/scripts/deploy-swarm.sh | bash
# =============================================================================

set -euo pipefail

REPO_RAW="https://raw.githubusercontent.com/nunu27/vlab-bun/main"
COMPOSE_URL="$REPO_RAW/docker-compose.yml"
NGINX_TMPL_URL="https://raw.githubusercontent.com/nginx-proxy/nginx-proxy/main/nginx.tmpl"
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
  LC_ALL=C tr -dc 'A-Za-z0-9!@#$%^&*' </dev/urandom | head -c 32
}

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
echo -e "${BLD}        vLab Swarm Deployment            ${RST}"
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

[[ "$(uname -s)" == "Linux" ]] || die "This script only supports Linux."

if ! command -v docker &>/dev/null; then
  warn "Docker not found. Installing via get.docker.com ..."
  curl -fsSL https://get.docker.com | sh
  if ! groups "$USER" | grep -q '\bdocker\b'; then
    sudo usermod -aG docker "$USER"
    warn "You have been added to the 'docker' group."
    warn "For this session, the script will use 'sudo docker' where needed."
    DOCKER_CMD="sudo docker"
  fi
fi

DOCKER_CMD="${DOCKER_CMD:-docker}"
$DOCKER_CMD info &>/dev/null || die "Docker daemon is not running. Start it with: sudo systemctl start docker"

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
fi

echo -e "\n${BLD}── Database (Postgres) ──────────────────${RST}"
prompt DB_USER "DB_USER" "$(read_env DB_USER "$MANAGER_ENV_FILE" || echo "vlab")"
prompt DB_NAME "DB_NAME" "$(read_env DB_NAME "$MANAGER_ENV_FILE" || echo "vlab")"
prompt_secret DB_PASSWORD "DB_PASSWORD" "$(read_env DB_PASSWORD "$MANAGER_ENV_FILE" || echo "vlab")"
# Derive DATABASE_URL for manager
DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}"

echo -e "\n${BLD}── S3 / RustFS ──────────────────────────${RST}"
prompt S3_ACCESS_KEY "S3_ACCESS_KEY" "$(read_env S3_ACCESS_KEY "$MANAGER_ENV_FILE" || echo "rustfsadmin")"
prompt_secret S3_SECRET_KEY "S3_SECRET_KEY" "$(read_env S3_SECRET_KEY "$MANAGER_ENV_FILE" || echo "rustfsadmin")"
S3_ENDPOINT="http://rustfs:9000/vlab"

echo -e "\n${BLD}── Auth ─────────────────────────────────${RST}"
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

echo -e "\n${BLD}── Reverse Proxy (nginx-proxy) ──────────${RST}"
prompt VIRTUAL_HOST "Hostname (e.g. vlab.example.com)" "$(read_env VIRTUAL_HOST "$MANAGER_ENV_FILE")"
prompt LETSENCRYPT_EMAIL "LETSENCRYPT_EMAIL" "$(read_env LETSENCRYPT_EMAIL "$MANAGER_ENV_FILE")"

[[ -n "$VIRTUAL_HOST" ]] || die "Hostname is required."
[[ -n "$LETSENCRYPT_EMAIL" ]] || die "LETSENCRYPT_EMAIL is required."

# Auto-derive multi-port mapping for nginx-proxy constraint
PORT=3000
DISPLAY_PORT=8080
VIRTUAL_HOST_MULTIPORTS="{\"${VIRTUAL_HOST}\":{\"/\":{\"port\":${PORT}},\"/display\":{\"port\":${DISPLAY_PORT},\"dest\":\"/\"}}}"
LETSENCRYPT_HOST="$VIRTUAL_HOST"
BASE_URL="https://${VIRTUAL_HOST}"

echo -e "\n${BLD}── Ports & Logging ──────────────────────${RST}"
prompt GRPC_PORT    "GRPC_PORT"    "$(read_env GRPC_PORT "$MANAGER_ENV_FILE" || echo "50051")"
prompt LOG_LEVEL    "LOG_LEVEL"    "$(read_env LOG_LEVEL "$MANAGER_ENV_FILE" || echo "info")"

# Write .env.manager
info "Writing .env.manager ..."
cat > "$MANAGER_ENV_FILE" <<EOF
# Generated by vLab deploy script on $(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Database
DB_USER="${DB_USER}"
DB_NAME="${DB_NAME}"
DB_PASSWORD="${DB_PASSWORD}"
DATABASE_URL="${DATABASE_URL}"
REDIS_URL="redis://redis:6379"

# S3 / RustFS
S3_ENDPOINT="${S3_ENDPOINT}"
S3_ACCESS_KEY="${S3_ACCESS_KEY}"
S3_SECRET_KEY="${S3_SECRET_KEY}"

# Auth
BASE_URL="${BASE_URL}"
CAS_BASE_URL="${CAS_BASE_URL}"
COOKIE_SECRET="${COOKIE_SECRET}"

# Guacamole
GUACD_SECRET="${GUACD_SECRET}"

# Proxy / Nginx
VIRTUAL_HOST="${VIRTUAL_HOST}"
VIRTUAL_HOST_MULTIPORTS=${VIRTUAL_HOST_MULTIPORTS}
LETSENCRYPT_HOST="${LETSENCRYPT_HOST}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL}"

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
# STEP 4 — Fetch files (Compose + Nginx Template)
# =============================================================================
echo
info "Fetching latest docker-compose.yml from GitHub (main) ..."
curl -fsSL "$COMPOSE_URL" -o "$SETUP_DIR/docker-compose.yml" \
  || die "Failed to download docker-compose.yml from $COMPOSE_URL"
success "docker-compose.yml updated."

info "Fetching latest nginx.tmpl for docker-gen ..."
curl -fsSL "$NGINX_TMPL_URL" -o "$SETUP_DIR/nginx.tmpl" \
  || die "Failed to download nginx.tmpl from $NGINX_TMPL_URL"
success "nginx.tmpl updated."

# =============================================================================
# STEP 5 — Deploy the stack
# =============================================================================
echo
info "Deploying stack '${STACK_NAME}' ..."
$DOCKER_CMD stack deploy -c "$SETUP_DIR/docker-compose.yml" "$STACK_NAME"
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

# =============================================================================
# STEP 7 — Initialize RustFS Bucket
# =============================================================================
echo
info "Initializing RustFS 'vlab' bucket ..."
if $DOCKER_CMD run --rm --network vlab-network minio/mc sh -c "mc alias set rustfs http://rustfs:9000 ${S3_ACCESS_KEY} ${S3_SECRET_KEY} >/dev/null 2>&1 && mc mb --ignore-existing rustfs/vlab >/dev/null 2>&1"; then
  success "RustFS bucket 'vlab' is ready."
else
  warn "Failed to automatically create the RustFS bucket. You may need to create it manually via the Web Console on port 9001."
fi

echo
echo -e "${GRN}${BLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
echo -e "${GRN}${BLD}  vLab Swarm is deployed!${RST}"
echo -e "${GRN}${BLD}  URL: ${BASE_URL}${RST}"
echo -e "${GRN}${BLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
echo
info "Useful commands:"
echo "  View manager logs:    docker service logs -f ${STACK_NAME}_manager"
echo "  View proxy logs:      docker service logs -f ${STACK_NAME}_nginx-proxy"
echo "  Status:               docker stack services ${STACK_NAME}"
echo "  Remove stack:         docker stack rm ${STACK_NAME}"

WORKER_TOKEN=$($DOCKER_CMD swarm join-token worker -q 2>/dev/null || true)
MANAGER_IP=$($DOCKER_CMD info --format '{{.Swarm.NodeAddr}}' 2>/dev/null || true)
if [[ -n "$WORKER_TOKEN" && -n "$MANAGER_IP" ]]; then
  echo
  echo "  To add a worker node, run this on the new machine:"
  echo "  docker swarm join --token ${WORKER_TOKEN} ${MANAGER_IP}:2377"
fi
echo
