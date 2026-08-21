#!/usr/bin/env bash
# =============================================================================
# vLab Deploy Script (Compose: App)
# Brings up the manager and/or worker role (docker-compose.app.yml) on this
# host, based on which role(s) are selected interactively.
# =============================================================================

set -euo pipefail

REPO_RAW="https://raw.githubusercontent.com/nunu27/vlab-bun/main"
COMPOSE_URL="$REPO_RAW/docker-compose.app.yml"
DEFAULT_SETUP_DIR="/opt/vlab/app"

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
	local var="$1" label="$2" default="${3:-}"
	local answer=""
	if [[ -n "$default" ]]; then
		read -rp "  ${label} [${default}]: " answer
		answer="${answer:-$default}"
	else
		read -rp "  ${label}: " answer
	fi
	printf -v "$var" '%s' "$answer"
}

prompt_yn() {
	local var="$1" label="$2" default="${3:-y}"
	local answer=""
	read -rp "  ${label} [${default}]: " answer
	answer="${answer:-$default}"
	if [[ "$answer" =~ ^[Yy] ]]; then printf -v "$var" 'y'; else printf -v "$var" 'n'; fi
}

prompt_secret() {
	local var="$1" label="$2" default="${3:-}" min_len="${4:-0}"
	local answer=""
	while true; do
		if [[ -n "$default" ]]; then
			read -rsp "  ${label} [leave blank to keep existing]: " answer
			echo
			answer="${answer:-$default}"
		else
			read -rsp "  ${label}: " answer
			echo
		fi
		if [[ ${#answer} -lt $min_len ]]; then
			echo "  [!] ${label} must be at least ${min_len} characters long." >&2
		else
			break
		fi
	done
	printf -v "$var" '%s' "$answer"
}

gen_secret() {
	# Alphanumeric only: these values can end up embedded in URIs or shell/env
	# files elsewhere, and unescaped special characters silently break those.
	LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom 2>/dev/null | head -c 32 || true
}

read_env() {
	local key="$1" file="$2"
	if [[ -f "$file" ]]; then
		grep -E "^${key}=" "$file" | head -1 | sed "s/^${key}=//" | tr -d '"' || true
	fi
}

echo
echo -e "${BLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
echo -e "${BLD}          vLab Compose: App Setup        ${RST}"
echo -e "${BLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
echo

prompt SETUP_DIR "Where should the app be set up?" "$DEFAULT_SETUP_DIR"

if [[ ! -d "$SETUP_DIR" ]]; then
	info "Creating directory $SETUP_DIR ..."
	sudo mkdir -p "$SETUP_DIR" || die "Failed to create $SETUP_DIR"
	sudo chown "$USER":"$USER" "$SETUP_DIR" || true
fi

cd "$SETUP_DIR"
success "Working directory: $(pwd)"

echo
info "Checking container runtime ..."
DOCKER_CMD="${DOCKER_CMD:-docker}"
COMPOSE_CMD="${COMPOSE_CMD:-$DOCKER_CMD compose}"
command -v "$DOCKER_CMD" &>/dev/null || die "$DOCKER_CMD is not installed."

echo
info "Checking Tailscale ..."
DETECTED_TAILSCALE_IP=""
if command -v tailscale &>/dev/null; then
	DETECTED_TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || true)
fi
[[ -n "$DETECTED_TAILSCALE_IP" ]] || warn "Could not auto-detect a Tailscale IP; enter it manually."

MANAGER_ENV_FILE="$SETUP_DIR/.env.manager"
WORKER_ENV_FILE="$SETUP_DIR/.env.worker"

echo -e "\n${BLD}── Role(s) for this host ────────────────${RST}"
prompt_yn RUN_MANAGER "Run the manager role on this host?" "y"
prompt_yn RUN_WORKER  "Run the worker role on this host?" "n"
[[ "$RUN_MANAGER" == "y" || "$RUN_WORKER" == "y" ]] || die "At least one role must be selected."

prompt TAILSCALE_IP "This host's Tailscale IP" \
	"$(read_env TAILSCALE_IP "$MANAGER_ENV_FILE" || read_env TAILSCALE_IP "$WORKER_ENV_FILE" || echo "${DETECTED_TAILSCALE_IP:-}")"
[[ -n "$TAILSCALE_IP" ]] || die "A Tailscale IP is required."

PROFILE_FLAGS=()

# =============================================================================
# Manager role
# =============================================================================
if [[ "$RUN_MANAGER" == "y" ]]; then
	echo -e "\n${BLD}── Manager identity ─────────────────────${RST}"
	prompt MANAGER_ID "MANAGER_ID (unique across all manager hosts)" \
		"$(read_env MANAGER_ID "$MANAGER_ENV_FILE" || echo "manager-$(hostname)")"

	echo -e "\n${BLD}── Shared infra endpoints ───────────────${RST}"
	warn "These come from the output of deploy-infra.sh on the infra host."
	prompt DATABASE_URL "DATABASE_URL" "$(read_env DATABASE_URL "$MANAGER_ENV_FILE" || echo "postgres://vlab:<password>@<infra-tailscale-ip>:5432/vlab")"
	prompt REDIS_URL "REDIS_URL" "$(read_env REDIS_URL "$MANAGER_ENV_FILE" || echo "redis://<infra-tailscale-ip>:6379")"
	prompt S3_ENDPOINT "S3_ENDPOINT" "$(read_env S3_ENDPOINT "$MANAGER_ENV_FILE" || echo "http://<infra-tailscale-ip>:9000/vlab")"
	prompt S3_ACCESS_KEY "S3_ACCESS_KEY" "$(read_env S3_ACCESS_KEY "$MANAGER_ENV_FILE" || echo "vlabadmin")"
	prompt_secret S3_SECRET_KEY "S3_SECRET_KEY" "$(read_env S3_SECRET_KEY "$MANAGER_ENV_FILE")" 8

	echo -e "\n${BLD}── Auth ─────────────────────────────────${RST}"
	prompt BASE_URL "BASE_URL (public URL of this deployment)" "$(read_env BASE_URL "$MANAGER_ENV_FILE" || echo "https://vlab.example.com")"
	prompt CAS_BASE_URL "CAS_BASE_URL" "$(read_env CAS_BASE_URL "$MANAGER_ENV_FILE" || echo "https://login.pens.ac.id")"

	echo -e "\n${BLD}── Shared secrets ───────────────────────${RST}"
	warn "COOKIE_SECRET and GUACD_SECRET MUST be identical across every manager replica."
	EXISTING_COOKIE_SECRET="$(read_env COOKIE_SECRET "$MANAGER_ENV_FILE")"
	if [[ -z "$EXISTING_COOKIE_SECRET" ]]; then
		warn "No existing COOKIE_SECRET found on this host — generating a new one."
		warn "If this is NOT the first manager host, STOP and paste the value from an existing host instead."
		COOKIE_SECRET="$(gen_secret)"
	else
		prompt_secret COOKIE_SECRET "COOKIE_SECRET" "$EXISTING_COOKIE_SECRET"
	fi
	EXISTING_GUACD_SECRET="$(read_env GUACD_SECRET "$MANAGER_ENV_FILE")"
	if [[ -z "$EXISTING_GUACD_SECRET" ]]; then
		warn "No existing GUACD_SECRET found on this host — generating a new one."
		warn "If this is NOT the first manager host, STOP and paste the value from an existing host instead."
		GUACD_SECRET="$(gen_secret)"
	else
		prompt_secret GUACD_SECRET "GUACD_SECRET" "$EXISTING_GUACD_SECRET"
	fi

	echo -e "\n${BLD}── Cloudflare Tunnel ─────────────────────${RST}"
	prompt_secret CLOUDFLARE_TUNNEL_TOKEN "CLOUDFLARE_TUNNEL_TOKEN" "$(read_env CLOUDFLARE_TUNNEL_TOKEN "$MANAGER_ENV_FILE")"

	info "Writing .env.manager ..."
	cat > "$MANAGER_ENV_FILE" <<EOF
# Generated by vLab deploy script on $(date -u +"%Y-%m-%dT%H:%M:%SZ")
TAILSCALE_IP=${TAILSCALE_IP}
MANAGER_ID=${MANAGER_ID}

DATABASE_URL=${DATABASE_URL}
REDIS_URL=${REDIS_URL}

S3_ENDPOINT=${S3_ENDPOINT}
S3_ACCESS_KEY=${S3_ACCESS_KEY}
S3_SECRET_KEY=${S3_SECRET_KEY}

BASE_URL=${BASE_URL}
CAS_BASE_URL=${CAS_BASE_URL}
COOKIE_SECRET=${COOKIE_SECRET}
GUACD_SECRET=${GUACD_SECRET}

CLOUDFLARE_TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
EOF
	chmod 600 "$MANAGER_ENV_FILE"
	success ".env.manager written."
	PROFILE_FLAGS+=(--profile manager --env-file .env.manager)
fi

# =============================================================================
# Worker role
# =============================================================================
if [[ "$RUN_WORKER" == "y" ]]; then
	echo -e "\n${BLD}── Worker identity ──────────────────────${RST}"
	prompt WORKER_ID "WORKER_ID (unique across all worker hosts)" \
		"$(read_env WORKER_ID "$WORKER_ENV_FILE" || echo "$(hostname)")"

	echo -e "\n${BLD}── Guacd Tailscale addressing ───────────${RST}"
	warn "This is the address other manager replicas will use to reach THIS worker's guacd."
	warn "Use this host's Tailscale IP, e.g. ${TAILSCALE_IP} — not a LAN/public IP or a MagicDNS name."
	warn "(MagicDNS names don't resolve from inside the container: it has no Tailscale DNS resolver.)"
	prompt GUACD_TAILSCALE_IP "GUACD_TAILSCALE_IP" "$(read_env GUACD_TAILSCALE_IP "$WORKER_ENV_FILE" || echo "$TAILSCALE_IP")"
	[[ -n "$GUACD_TAILSCALE_IP" ]] || die "GUACD_TAILSCALE_IP is required."

	info "Writing .env.worker ..."
	cat > "$WORKER_ENV_FILE" <<EOF
# Generated by vLab deploy script on $(date -u +"%Y-%m-%dT%H:%M:%SZ")
TAILSCALE_IP=${TAILSCALE_IP}
WORKER_ID=${WORKER_ID}
GUACD_TAILSCALE_IP=${GUACD_TAILSCALE_IP}
EOF
	chmod 600 "$WORKER_ENV_FILE"
	success ".env.worker written."
	PROFILE_FLAGS+=(--profile worker --env-file .env.worker)
fi

# =============================================================================
# Deploy
# =============================================================================
echo
info "Fetching latest docker-compose.app.yml ..."
curl -fsSL "$COMPOSE_URL" -o "$SETUP_DIR/docker-compose.app.yml" \
	|| die "Failed to download docker-compose.app.yml from $COMPOSE_URL"
success "docker-compose.app.yml updated."

echo
info "Starting selected role(s) ..."
$COMPOSE_CMD -f docker-compose.app.yml "${PROFILE_FLAGS[@]}" up -d
success "App services started."

echo
echo -e "${GRN}${BLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
echo -e "${GRN}${BLD}  vLab app is deployed on this host!${RST}"
echo -e "${GRN}${BLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
echo
info "Useful commands:"
echo "  View logs:    docker compose -f $SETUP_DIR/docker-compose.app.yml logs -f"
echo "  Status:       docker compose -f $SETUP_DIR/docker-compose.app.yml ps"
echo "  Stop:         docker compose -f $SETUP_DIR/docker-compose.app.yml down"
echo
