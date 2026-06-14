#!/usr/bin/env bash
# =============================================================================
# vLab Deploy Script (Manual Manager Setup)
# =============================================================================

set -euo pipefail

DEFAULT_SETUP_DIR="/opt/vlab/manager"

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

echo
echo -e "${BLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
echo -e "${BLD}      vLab Manager Manual Setup          ${RST}"
echo -e "${BLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
echo

prompt SETUP_DIR "Where should the Manager be set up?" "$DEFAULT_SETUP_DIR"

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

$DOCKER_CMD network create vlab-network 2>/dev/null || true

MANAGER_ENV_FILE="$SETUP_DIR/.env.manager"

echo -e "\n${BLD}── Database (Postgres) ──────────────────${RST}"
prompt DATABASE_URL "DATABASE_URL" "$(read_env DATABASE_URL "$MANAGER_ENV_FILE" || echo "postgres://vlab:vlab@<postgres-ip>:5432/vlab")"

echo -e "\n${BLD}── Redis ────────────────────────────────${RST}"
prompt REDIS_URL "REDIS_URL" "$(read_env REDIS_URL "$MANAGER_ENV_FILE" || echo "redis://<redis-ip>:6379")"

echo -e "\n${BLD}── S3 / RustFS ──────────────────────────${RST}"
prompt S3_ENDPOINT "S3_ENDPOINT" "$(read_env S3_ENDPOINT "$MANAGER_ENV_FILE" || echo "http://<rustfs-ip>:9000/vlab")"
prompt S3_ACCESS_KEY "S3_ACCESS_KEY" "$(read_env S3_ACCESS_KEY "$MANAGER_ENV_FILE" || echo "rustfsadmin")"
prompt_secret S3_SECRET_KEY "S3_SECRET_KEY" "$(read_env S3_SECRET_KEY "$MANAGER_ENV_FILE" || echo "rustfsadmin")"

echo -e "\n${BLD}── Auth & Secrets ───────────────────────${RST}"
prompt BASE_URL "BASE_URL" "$(read_env BASE_URL "$MANAGER_ENV_FILE" || echo "http://localhost:3000")"
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

cat > "$MANAGER_ENV_FILE" <<EOF
MANAGER_ID=manual-manager-1
DATABASE_URL=${DATABASE_URL}
REDIS_URL=${REDIS_URL}
S3_ENDPOINT=${S3_ENDPOINT}
S3_ACCESS_KEY=${S3_ACCESS_KEY}
S3_SECRET_KEY=${S3_SECRET_KEY}
BASE_URL=${BASE_URL}
CAS_BASE_URL=${CAS_BASE_URL}
COOKIE_SECRET=${COOKIE_SECRET}
GUACD_SECRET=${GUACD_SECRET}
# Manager fallback (Workers provide their own guacd routing via gRPC)
GUACD_HOST=127.0.0.1
GUACD_PORT=4822
EOF

success "Saved $MANAGER_ENV_FILE"

echo
info "Stopping any existing manual manager container..."
$DOCKER_CMD rm -f vlab-manager 2>/dev/null || true

info "Starting vLab Manager..."
$DOCKER_CMD run -d \
  --name vlab-manager \
  --network vlab-network \
  --env-file "$MANAGER_ENV_FILE" \
  -p 3000:3000 \
  -p 50051:50051 \
  -p 8080:8080 \
  --restart unless-stopped \
  ghcr.io/nunu27/vlab-bun-manager:latest >/dev/null

echo
success "vLab Manager deployed!"
echo "  View logs:   docker logs -f vlab-manager"
echo "  Web UI:      $BASE_URL"
echo
