#!/usr/bin/env bash
# Usage: swarm-check.sh <manager|worker> [manager-ip]
#   manager-ip  IP or hostname of the Swarm manager (required for worker mode)

set -euo pipefail

MODE="${1:-}"
MANAGER_IP="${2:-}"

PASS=0
FAIL=0

green() { printf '\033[32m✔ %s\033[0m\n' "$*"; }
red()   { printf '\033[31m✘ %s\033[0m\n' "$*"; }
info()  { printf '\033[33m» %s\033[0m\n' "$*"; }

ok()   { green "$*"; ((PASS++)) || true; }
fail() { red   "$*"; ((FAIL++)) || true; }

check_port_tcp() {
  local host=$1 port=$2 label=$3
  if timeout 5 bash -c "echo > /dev/tcp/$host/$port" 2>/dev/null; then
    ok  "TCP $port reachable ($label)"
  else
    fail "TCP $port BLOCKED ($label)"
  fi
}

check_port_udp_local() {
  local port=$1 label=$2
  if ss -lunp | grep -q ":$port "; then
    ok  "UDP $port listening ($label)"
  else
    fail "UDP $port not listening ($label)"
  fi
}

usage() {
  echo "Usage: $0 <manager|worker> [manager-ip]"
  echo "  manager     Check this node as a Swarm manager"
  echo "  worker      Check this node as a Swarm worker (requires manager-ip)"
  exit 1
}

[[ "$MODE" == "manager" || "$MODE" == "worker" ]] || usage
[[ "$MODE" == "worker" && -z "$MANAGER_IP" ]] && { echo "Error: manager-ip is required for worker mode"; usage; }

echo
info "=== Swarm connectivity check, mode: $MODE ==="
echo

# ── Common checks ─────────────────────────────────────────────────────────────

info "── Docker daemon"
if docker info &>/dev/null; then
  ok  "Docker daemon is running"
else
  fail "Docker daemon is not running or not accessible"
fi

info "── Swarm membership"
SWARM_STATE=$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || echo "unknown")
if [[ "$SWARM_STATE" == "active" ]]; then
  ok  "Node is active in a Swarm (state=$SWARM_STATE)"
else
  fail "Node is not in a Swarm (state=$SWARM_STATE)"
fi

if [[ "$MODE" == "manager" ]]; then
  IS_MANAGER=$(docker info --format '{{.Swarm.ControlAvailable}}' 2>/dev/null || echo "false")
  if [[ "$IS_MANAGER" == "true" ]]; then
    ok  "Node has manager/control-plane role"
  else
    fail "Node is not a Swarm manager"
  fi
fi

# ── Local port checks ─────────────────────────────────────────────────────────

info "── Local listening ports"
if ss -tlnp | grep -q ':2377 '; then
  [[ "$MODE" == "manager" ]] && ok "TCP 2377 listening (Swarm control)" || ok "TCP 2377 listening (reachable by workers)"
fi

check_port_udp_local 7946 "gossip"
check_port_udp_local 4789 "VXLAN"

# ── Firewall / inbound checks ─────────────────────────────────────────────────

info "── Inbound firewall rules"

check_inbound_tcp() {
  local port=$1 label=$2
  # nft / iptables: look for an ACCEPT rule covering this port before any REJECT/DROP
  local accepted=false
  if sudo nft list ruleset 2>/dev/null | grep -qE "tcp dport $port.*accept"; then
    accepted=true
  elif sudo iptables -L INPUT -n 2>/dev/null | grep -qE "ACCEPT.*tcp.*dpt:$port"; then
    accepted=true
  fi
  if $accepted; then
    ok  "TCP $port has explicit ACCEPT rule ($label)"
  else
    # Check if there's a blanket REJECT before this port's traffic would be matched
    if sudo nft list ruleset 2>/dev/null | grep -qE 'reject with icmp' \
      || sudo iptables -L INPUT -n 2>/dev/null | grep -q 'REJECT'; then
      fail "TCP $port: REJECT rule present without explicit ACCEPT ($label)"
    else
      ok  "TCP $port: no REJECT rule, traffic likely passes ($label)"
    fi
  fi
}

check_inbound_udp() {
  local port=$1 label=$2
  local accepted=false
  if sudo nft list ruleset 2>/dev/null | grep -qE "udp dport $port.*accept"; then
    accepted=true
  elif sudo iptables -L INPUT -n 2>/dev/null | grep -qE "ACCEPT.*udp.*dpt:$port"; then
    accepted=true
  fi
  if $accepted; then
    ok  "UDP $port has explicit ACCEPT rule ($label)"
  else
    if sudo nft list ruleset 2>/dev/null | grep -qE 'reject with icmp' \
      || sudo iptables -L INPUT -n 2>/dev/null | grep -q 'REJECT'; then
      fail "UDP $port: REJECT rule present without explicit ACCEPT ($label)"
    else
      ok  "UDP $port: no REJECT rule, traffic likely passes ($label)"
    fi
  fi
}

check_inbound_tcp 7946 "gossip bulk sync"
check_inbound_udp 7946 "gossip"
check_inbound_udp 4789 "VXLAN"

if [[ "$MODE" == "manager" ]]; then
  check_inbound_tcp 2377 "Swarm control"
fi

# ── Manager-specific checks ───────────────────────────────────────────────────

if [[ "$MODE" == "manager" ]]; then
  info "── Swarm cluster state"

  NODE_COUNT=$(docker node ls --format '{{.ID}}' 2>/dev/null | wc -l || echo 0)
  if [[ "$NODE_COUNT" -gt 0 ]]; then
    ok  "$NODE_COUNT node(s) visible in cluster"
  else
    fail "No nodes visible (docker node ls failed)"
  fi

  UNREACHABLE=$(docker node ls --format '{{.Status}}' 2>/dev/null | grep -c -i 'down\|unreachable' || true)
  if [[ "$UNREACHABLE" -eq 0 ]]; then
    ok  "All nodes are Ready"
  else
    fail "$UNREACHABLE node(s) are Down/Unreachable"
  fi

  info "── Overlay network"
  OVERLAY_NET=$(docker network ls --filter driver=overlay --format '{{.Name}}' | head -1)
  if [[ -n "$OVERLAY_NET" ]]; then
    ok  "Overlay network present: $OVERLAY_NET"
  else
    fail "No overlay network found"
  fi

  info "── NetworkDB gossip health (recent Docker logs)"
  SYNC_ERRORS=$(sudo journalctl -u docker --since "5 minutes ago" --no-pager 2>/dev/null \
    | grep -c "Bulk sync.*timed out" || true)
  if [[ "$SYNC_ERRORS" -eq 0 ]]; then
    ok  "No NetworkDB bulk sync timeouts in the last 5 minutes"
  else
    fail "$SYNC_ERRORS NetworkDB bulk sync timeout(s) in the last 5 minutes"
  fi
fi

# ── Worker-specific checks ────────────────────────────────────────────────────

if [[ "$MODE" == "worker" ]]; then
  info "── Connectivity to manager ($MANAGER_IP)"

  check_port_tcp "$MANAGER_IP" 2377 "Swarm control"
  check_port_tcp "$MANAGER_IP" 7946 "gossip bulk sync"

  info "── NetworkDB gossip health (recent Docker logs)"
  SYNC_ERRORS=$(sudo journalctl -u docker --since "5 minutes ago" --no-pager 2>/dev/null \
    | grep -c "Bulk sync.*timed out" || true)
  if [[ "$SYNC_ERRORS" -eq 0 ]]; then
    ok  "No NetworkDB bulk sync timeouts in the last 5 minutes"
  else
    fail "$SYNC_ERRORS NetworkDB bulk sync timeout(s) in the last 5 minutes: check inbound TCP/UDP 7946 from manager"
  fi

  info "── Overlay network attachment + DNS test"
  # Only attachable overlay networks can be used by standalone containers.
  # The built-in 'ingress' network is not attachable.
  OVERLAY_NET=$(docker network ls --filter driver=overlay --format '{{.Name}} {{.ID}}' 2>/dev/null \
    | while read -r name id; do
        docker network inspect "$id" --format '{{if .Attachable}}{{.Name}}{{end}}' 2>/dev/null
      done \
    | grep -v '^$' | head -1 || true)
  if [[ -n "$OVERLAY_NET" ]]; then
    ATTACH_OUT=$(docker run --rm --network "$OVERLAY_NET" --entrypoint sh alpine:latest \
      -c "getent hosts manager 2>/dev/null | awk '{print \$1}'" 2>&1 || true)
    if echo "$ATTACH_OUT" | grep -qE '^[0-9]+\.[0-9]+\.'; then
      ok  "Overlay attach + DNS: 'manager' → $ATTACH_OUT (via $OVERLAY_NET)"
    else
      fail "Overlay attach or DNS failed on $OVERLAY_NET (output: ${ATTACH_OUT:-<empty>})"
    fi
  else
    fail "No attachable overlay network found to test against"
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo
if [[ "$FAIL" -eq 0 ]]; then
  green "All $PASS checks passed."
else
  red   "$FAIL check(s) failed, $PASS passed."
  exit 1
fi
