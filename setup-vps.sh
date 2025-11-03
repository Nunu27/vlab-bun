#!/bin/bash

# VPS Setup Script
# Run this on your VPS to configure the deployment environment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_step() {
    echo -e "${MAGENTA}▶  $1${NC}"
}

# Welcome banner
clear
print_header "🧪 vLab VPS Setup Script"

# Display current machine info
CURRENT_HOSTNAME=$(hostname 2>/dev/null || cat /etc/hostname 2>/dev/null || echo "unknown")
CURRENT_USER=$(whoami)
CURRENT_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || ip addr show 2>/dev/null | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}' | cut -d/ -f1 || curl -s ifconfig.me 2>/dev/null || echo "unknown")

echo -e "${BLUE}Current Machine:${NC}"
echo -e "  ${CYAN}User:${NC} $CURRENT_USER"
echo -e "  ${CYAN}Hostname:${NC} $CURRENT_HOSTNAME"
echo -e "  ${CYAN}IP:${NC} $CURRENT_IP"
echo ""
echo -e "${CYAN}This script will help you set up your VPS for vLab deployment${NC}"
echo ""

# Check if we should run remotely
read -p "Run setup on remote VPS? (y/n) [n]: " RUN_REMOTE
RUN_REMOTE=${RUN_REMOTE:-n}

if [ "$RUN_REMOTE" = "y" ] || [ "$RUN_REMOTE" = "Y" ]; then
    print_header "Remote VPS Setup"
    
    echo -e "${YELLOW}Running from:${NC} $CURRENT_USER@$CURRENT_HOSTNAME ($CURRENT_IP)"
    echo ""
    
    read -p "Enter VPS IP or hostname: " REMOTE_HOST
    read -p "Enter SSH user [root]: " REMOTE_USER
    REMOTE_USER=${REMOTE_USER:-root}
    read -p "Enter SSH port [22]: " REMOTE_PORT
    REMOTE_PORT=${REMOTE_PORT:-22}
    read -p "Enter SSH key path (leave empty for default): " SSH_KEY_PATH
    
    # Expand tilde to home directory if SSH key path provided
    if [ -n "$SSH_KEY_PATH" ]; then
        SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
        
        if [ ! -f "$SSH_KEY_PATH" ]; then
            print_error "SSH key not found: $SSH_KEY_PATH"
            exit 1
        fi
    fi
    
    # Build SSH command arguments
    SSH_ARGS=(-p "$REMOTE_PORT" -o ConnectTimeout=5)
    SCP_ARGS=(-P "$REMOTE_PORT")
    
    if [ -n "$SSH_KEY_PATH" ]; then
        SSH_ARGS+=(-i "$SSH_KEY_PATH")
        SCP_ARGS+=(-i "$SSH_KEY_PATH")
    fi
    
    print_step "Testing SSH connection..."
    if ! ssh "${SSH_ARGS[@]}" -o BatchMode=yes "$REMOTE_USER@$REMOTE_HOST" exit 2>/dev/null; then
        print_warning "Cannot connect with key-based auth, you may need to enter password"
    fi
    
    print_step "Copying script to VPS..."
    scp "${SCP_ARGS[@]}" "$0" "$REMOTE_USER@$REMOTE_HOST:/tmp/setup-vps.sh"
    
    print_step "Executing script on VPS..."
    ssh "${SSH_ARGS[@]}" -t "$REMOTE_USER@$REMOTE_HOST" "chmod +x /tmp/setup-vps.sh && /tmp/setup-vps.sh && rm /tmp/setup-vps.sh"
    
    exit 0
fi

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_warning "Please don't run this script as root"
    print_info "Run as a regular user with sudo privileges"
    exit 1
fi

# Check sudo access
if ! sudo -v; then
    print_error "This script requires sudo privileges"
    exit 1
fi

echo -e "${YELLOW}Press Enter to continue or Ctrl+C to cancel${NC}"
read -r

# Step 1: Docker Installation
print_header "Step 1: Docker Installation"

if command -v docker &> /dev/null; then
    print_success "Docker is already installed"
    docker --version
else
    print_step "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    
    print_step "Adding user to docker group..."
    sudo usermod -aG docker "$USER"
    
    print_success "Docker installed successfully"
    print_warning "You may need to log out and back in for docker group changes to take effect"
fi

# Step 2: Deployment Directory
print_header "Step 2: Deployment Directory"

read -p "Enter deployment directory path [/opt/vlab]: " DEPLOY_PATH
DEPLOY_PATH=${DEPLOY_PATH:-/opt/vlab}

print_step "Creating deployment directory: $DEPLOY_PATH"
sudo mkdir -p "$DEPLOY_PATH"
sudo chown "$USER:$USER" "$DEPLOY_PATH"
cd "$DEPLOY_PATH"

print_success "Deployment directory created"

# Step 3: Docker Networks
print_header "Step 3: Docker Networks Configuration"

read -p "Enter Docker networks (comma-separated) [proxy,bridge]: " NETWORKS_INPUT
NETWORKS_INPUT=${NETWORKS_INPUT:-proxy,bridge}

IFS=',' read -ra NETWORKS_ARRAY <<< "$NETWORKS_INPUT"
for network in "${NETWORKS_ARRAY[@]}"; do
    network=$(echo "$network" | xargs)
    if [ "$network" = "bridge" ]; then
        print_info "bridge is a default network, skipping..."
        continue
    fi
    
    if docker network inspect "$network" &> /dev/null; then
        print_info "Network '$network' already exists"
    else
        print_step "Creating network: $network"
        docker network create "$network"
        print_success "Network '$network' created"
    fi
done

# Step 4: Database Configuration
print_header "Step 4: Database Configuration"

print_info "Enter your PostgreSQL connection details"
read -p "Database Host: " DB_HOST
read -p "Database Port [5432]: " DB_PORT
DB_PORT=${DB_PORT:-5432}
read -p "Database Name [vlab]: " DB_NAME
DB_NAME=${DB_NAME:-vlab}
read -p "Database User [vlab]: " DB_USER
DB_USER=${DB_USER:-vlab}
read -sp "Database Password: " DB_PASSWORD
echo ""

DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Test database connection
print_step "Testing database connection..."
if docker run --rm postgres:18-alpine psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
    print_success "Database connection successful"
else
    print_error "Database connection failed"
    print_warning "Continuing anyway, but you may need to fix the connection later"
fi

# Step 5: Redis Configuration
print_header "Step 5: Redis Configuration"

print_info "Enter your Redis connection details"
read -p "Redis Host: " REDIS_HOST
read -p "Redis Port [6379]: " REDIS_PORT
REDIS_PORT=${REDIS_PORT:-6379}
read -p "Redis Password (leave empty if none): " REDIS_PASSWORD

if [ -n "$REDIS_PASSWORD" ]; then
    REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}"
else
    REDIS_URL="redis://${REDIS_HOST}:${REDIS_PORT}"
fi

# Test Redis connection
print_step "Testing Redis connection..."
if docker run --rm redis:8-alpine redis-cli -u "$REDIS_URL" ping &> /dev/null; then
    print_success "Redis connection successful"
else
    print_error "Redis connection failed"
    print_warning "Continuing anyway, but you may need to fix the connection later"
fi

# Step 6: Application Configuration
print_header "Step 6: Application Configuration"

read -p "Enter your domain/URL (e.g., https://vlab.example.com): " BASE_URL
read -p "Enter CAS server URL (e.g., https://cas.example.com/cas): " CAS_BASE_URL

print_info "Port binding configuration"
echo "Leave empty if you're using nginx-proxy (recommended)"
read -p "Bind to port (leave empty for no port binding): " BIND_PORT

read -p "Session TTL in seconds [10800]: " SESSION_TTL
SESSION_TTL=${SESSION_TTL:-10800}

# Step 7: nginx-proxy Configuration
print_header "Step 7: Reverse Proxy Configuration"

read -p "Are you using nginx-proxy? (y/n) [y]: " USE_NGINX_PROXY
USE_NGINX_PROXY=${USE_NGINX_PROXY:-y}

if [ "$USE_NGINX_PROXY" = "y" ] || [ "$USE_NGINX_PROXY" = "Y" ]; then
    read -p "Enter virtual host (domain) [${BASE_URL#https://}]: " VIRTUAL_HOST
    VIRTUAL_HOST=${VIRTUAL_HOST:-${BASE_URL#https://}}
    VIRTUAL_HOST=${VIRTUAL_HOST#http://}
    
    read -p "Enable Let's Encrypt SSL? (y/n) [y]: " USE_LETSENCRYPT
    USE_LETSENCRYPT=${USE_LETSENCRYPT:-y}
    
    if [ "$USE_LETSENCRYPT" = "y" ] || [ "$USE_LETSENCRYPT" = "Y" ]; then
        read -p "Enter email for Let's Encrypt: " LETSENCRYPT_EMAIL
    fi
else
    VIRTUAL_HOST=""
fi

# Step 8: Create .env file
print_header "Step 8: Creating Environment File"

cat > "$DEPLOY_PATH/.env" << EOF
# vLab Production Environment Configuration
# Generated on $(date)

# Database Configuration (External)
DATABASE_URL=$DATABASE_URL

# Redis Configuration (External)
REDIS_URL=$REDIS_URL

# Docker Networks
DOCKER_NETWORKS=$NETWORKS_INPUT

# Application Configuration
EOF

if [ -n "$BIND_PORT" ]; then
    echo "BIND_PORT=$BIND_PORT" >> "$DEPLOY_PATH/.env"
else
    echo "# BIND_PORT=  # No port binding (using reverse proxy)" >> "$DEPLOY_PATH/.env"
fi

cat >> "$DEPLOY_PATH/.env" << EOF
SESSION_TTL=$SESSION_TTL

# Batching Configuration
BATCH_SIZE=100
DEBOUNCE_MS=100
MAX_BATCH_WAIT_MS=500

# URLs
BASE_URL=$BASE_URL
CAS_BASE_URL=$CAS_BASE_URL
EOF

if [ -n "$VIRTUAL_HOST" ]; then
    cat >> "$DEPLOY_PATH/.env" << EOF

# Reverse Proxy Configuration
VIRTUAL_HOST=$VIRTUAL_HOST
VIRTUAL_PORT=3000
EOF
    
    if [ "$USE_LETSENCRYPT" = "y" ] || [ "$USE_LETSENCRYPT" = "Y" ]; then
        cat >> "$DEPLOY_PATH/.env" << EOF
LETSENCRYPT_HOST=$VIRTUAL_HOST
LETSENCRYPT_EMAIL=$LETSENCRYPT_EMAIL
EOF
    fi
fi

print_success ".env file created at $DEPLOY_PATH/.env"

# Step 9: SSH Key for GitHub Actions
print_header "Step 9: SSH Key Configuration"

SSH_KEY_PATH="$HOME/.ssh/vlab_deploy"

if [ -f "$SSH_KEY_PATH" ]; then
    print_warning "SSH key already exists at $SSH_KEY_PATH"
    read -p "Use existing key? (y/n) [y]: " USE_EXISTING
    USE_EXISTING=${USE_EXISTING:-y}
    
    if [ "$USE_EXISTING" != "y" ] && [ "$USE_EXISTING" != "Y" ]; then
        SSH_KEY_PATH="$HOME/.ssh/vlab_deploy_$(date +%s)"
        print_step "Creating new SSH key at $SSH_KEY_PATH"
        ssh-keygen -t ed25519 -f "$SSH_KEY_PATH" -N "" -C "vlab-github-actions"
    fi
else
    print_step "Creating SSH key for GitHub Actions..."
    ssh-keygen -t ed25519 -f "$SSH_KEY_PATH" -N "" -C "vlab-github-actions"
fi

# Add public key to authorized_keys
print_step "Adding public key to authorized_keys..."
mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"
cat "${SSH_KEY_PATH}.pub" >> "$HOME/.ssh/authorized_keys"
chmod 600 "$HOME/.ssh/authorized_keys"

print_success "SSH key configured"

# Step 10: Generate GitHub Secrets
print_header "Step 10: GitHub Repository Configuration"

print_success "Setup complete! 🎉"
echo ""

# Get VPS IP
VPS_IP=$(hostname -I | awk '{print $1}')
if [ -z "$VPS_IP" ]; then
    VPS_IP=$(curl -s ifconfig.me)
fi

VPS_USER=$(whoami)
SSH_PORT=$(grep "^Port" /etc/ssh/sshd_config 2>/dev/null | awk '{print $2}')
SSH_PORT=${SSH_PORT:-22}

print_header "📋 GitHub Repository Secrets Configuration"

echo -e "${CYAN}Go to your GitHub repository → Settings → Secrets and variables → Actions${NC}"
echo -e "${CYAN}Add the following secrets:${NC}"
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Secret Name:${NC} VPS_HOST"
echo -e "${WHITE}Value:${NC}"
echo -e "${MAGENTA}$VPS_IP${NC}"
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Secret Name:${NC} VPS_USERNAME"
echo -e "${WHITE}Value:${NC}"
echo -e "${MAGENTA}$VPS_USER${NC}"
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Secret Name:${NC} VPS_SSH_KEY"
echo -e "${WHITE}Value (copy the entire key including BEGIN and END):${NC}"
echo ""
echo -e "${CYAN}--- Copy from here ---${NC}"
cat "$SSH_KEY_PATH"
echo -e "${CYAN}--- Copy to here ---${NC}"
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Secret Name:${NC} VPS_PORT"
echo -e "${WHITE}Value:${NC}"
echo -e "${MAGENTA}$SSH_PORT${NC}"
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Secret Name:${NC} VPS_DEPLOY_PATH"
echo -e "${WHITE}Value:${NC}"
echo -e "${MAGENTA}$DEPLOY_PATH${NC}"
echo ""

# Detect architecture
VPS_ARCH=$(uname -m)
case "$VPS_ARCH" in
    x86_64)
        DOCKER_PLATFORM="linux/amd64"
        ;;
    aarch64|arm64)
        DOCKER_PLATFORM="linux/arm64"
        ;;
    armv7l)
        DOCKER_PLATFORM="linux/arm/v7"
        ;;
    *)
        DOCKER_PLATFORM="linux/amd64"
        print_warning "Unknown architecture: $VPS_ARCH, defaulting to linux/amd64"
        ;;
esac

# Variables section
print_header "📋 GitHub Repository Variables Configuration"

echo -e "${CYAN}Go to your GitHub repository → Settings → Secrets and variables → Actions → Variables tab${NC}"
echo -e "${CYAN}Add the following variable:${NC}"
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Variable Name:${NC} DOCKER_PLATFORMS"
echo -e "${WHITE}Value (detected from VPS architecture):${NC}"
echo -e "${MAGENTA}$DOCKER_PLATFORM${NC}"
echo ""
echo -e "${CYAN}VPS Architecture detected: $VPS_ARCH${NC}"
echo ""

# Summary
print_header "📝 Configuration Summary"

echo -e "${CYAN}Deployment Directory:${NC} $DEPLOY_PATH"
echo -e "${CYAN}Docker Networks:${NC} $NETWORKS_INPUT"
echo -e "${CYAN}Database:${NC} ${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo -e "${CYAN}Redis:${NC} ${REDIS_HOST}:${REDIS_PORT}"
echo -e "${CYAN}Base URL:${NC} $BASE_URL"
if [ -n "$BIND_PORT" ]; then
    echo -e "${CYAN}Port Binding:${NC} $BIND_PORT:3000"
else
    echo -e "${CYAN}Port Binding:${NC} None (using reverse proxy)"
fi
if [ -n "$VIRTUAL_HOST" ]; then
    echo -e "${CYAN}Virtual Host:${NC} $VIRTUAL_HOST"
fi
echo ""

print_header "🚀 Next Steps"

echo -e "${CYAN}1.${NC} Add the secrets and variables to your GitHub repository (shown above)"
echo -e "${CYAN}2.${NC} Push your code to the main branch:"
echo -e "   ${YELLOW}git push origin main${NC}"
echo -e "${CYAN}3.${NC} GitHub Actions will automatically build and deploy"
echo -e "${CYAN}4.${NC} Monitor deployment at: ${YELLOW}https://github.com/YOUR_REPO/actions${NC}"
echo ""

if [ "$USE_NGINX_PROXY" = "y" ] || [ "$USE_NGINX_PROXY" = "Y" ]; then
    echo -e "${YELLOW}Note: Make sure nginx-proxy is running before deployment${NC}"
    echo -e "${YELLOW}If not installed, check the documentation for setup instructions${NC}"
    echo ""
fi

print_info "Configuration saved to: $DEPLOY_PATH/.env"
print_info "SSH private key saved to: $SSH_KEY_PATH"
print_warning "Keep the SSH private key secure and never commit it to git!"

echo ""
print_success "VPS setup completed successfully! 🎉"
echo ""
