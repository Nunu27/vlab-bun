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
    echo -e "${CYAN}━━━ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_step() {
    echo -e "${MAGENTA}→ $1${NC}"
}

# Welcome banner
clear
print_header "🧪 vLab VPS Setup"

# Display current machine info
CURRENT_HOSTNAME=$(hostname 2>/dev/null || cat /etc/hostname 2>/dev/null || echo "unknown")
CURRENT_USER=$(whoami)
CURRENT_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || ip addr show 2>/dev/null | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}' | cut -d/ -f1 || curl -s ifconfig.me 2>/dev/null || echo "unknown")

echo -e "${CYAN}Machine:${NC} $CURRENT_USER@$CURRENT_HOSTNAME ($CURRENT_IP)"
echo ""

# Check if we should run remotely
read -p "Run on remote VPS? (y/n) [n]: " RUN_REMOTE
RUN_REMOTE=${RUN_REMOTE:-n}

if [ "$RUN_REMOTE" = "y" ] || [ "$RUN_REMOTE" = "Y" ]; then
    print_header "Remote Setup"
    
    echo -e "${YELLOW}From:${NC} $CURRENT_USER@$CURRENT_HOSTNAME"
    
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
        print_info "Key-based auth not available, password may be required"
    fi
    
    print_step "Copying script to VPS..."
    scp "${SCP_ARGS[@]}" "$0" "$REMOTE_USER@$REMOTE_HOST:/tmp/setup-vps.sh"
    
    print_step "Executing script on VPS..."
    ssh "${SSH_ARGS[@]}" -t "$REMOTE_USER@$REMOTE_HOST" "chmod +x /tmp/setup-vps.sh && /tmp/setup-vps.sh && rm /tmp/setup-vps.sh"
    
    exit 0
fi

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_error "Don't run as root. Use a regular user with sudo privileges"
    exit 1
fi

# Check sudo access
if ! sudo -v; then
    print_error "Sudo privileges required"
    exit 1
fi

echo -e "${YELLOW}Press Enter to continue or Ctrl+C to cancel${NC}"
read -r

# Step 1: Docker Installation
print_header "Step 1: Docker"

if command -v docker &> /dev/null; then
    print_success "Docker already installed ($(docker --version))"
else
    print_step "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    
    print_step "Adding user to docker group..."
    sudo usermod -aG docker "$USER"
    
    print_success "Docker installed"
    print_warning "Log out and back in for docker group changes"
fi

# Check for git (needed for ARM builds)
if ! command -v git &> /dev/null; then
    print_step "Installing git..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y git
    elif command -v yum &> /dev/null; then
        sudo yum install -y git
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y git
    elif command -v pacman &> /dev/null; then
        sudo pacman -S --noconfirm git
    else
        print_warning "Could not install git automatically. Please install it manually if building guacd from source."
    fi
    
    if command -v git &> /dev/null; then
        print_success "git installed"
    fi
fi

# Step 2: Deploy Directory
print_header "Step 2: Deploy Directory"

read -p "Enter deployment directory path [/opt/vlab]: " DEPLOY_PATH
DEPLOY_PATH=${DEPLOY_PATH:-/opt/vlab}

print_step "Creating deployment directory: $DEPLOY_PATH"
sudo mkdir -p "$DEPLOY_PATH"
sudo chown "$USER:$USER" "$DEPLOY_PATH"
cd "$DEPLOY_PATH"

print_success "Deployment directory ready"

# Load existing .env if present
ENV_FILE="$DEPLOY_PATH/.env"
if [ -f "$ENV_FILE" ]; then
    print_info "Found existing .env file"
    
    # Parse existing values
    EXISTING_DB_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
    EXISTING_REDIS_URL=$(grep "^REDIS_URL=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
    EXISTING_NETWORKS=$(grep "^DOCKER_NETWORKS=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
    EXISTING_BIND_PORT=$(grep "^BIND_PORT=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
    EXISTING_SESSION_TTL=$(grep "^SESSION_TTL=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
    EXISTING_BASE_URL=$(grep "^BASE_URL=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
    EXISTING_CAS_URL=$(grep "^CAS_BASE_URL=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
    EXISTING_VIRTUAL_HOST=$(grep "^VIRTUAL_HOST=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
    EXISTING_LETSENCRYPT_EMAIL=$(grep "^LETSENCRYPT_EMAIL=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
    EXISTING_S3_ACCESS_KEY=$(grep "^S3_ACCESS_KEY=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
    EXISTING_S3_SECRET_KEY=$(grep "^S3_SECRET_KEY=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
    EXISTING_S3_ENDPOINT=$(grep "^S3_ENDPOINT=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
    
    # Extract DB details from DATABASE_URL if present
    if [ -n "$EXISTING_DB_URL" ]; then
        # Parse postgresql://user:pass@host:port/dbname
        DB_REGEX="postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.*)"
        if [[ "$EXISTING_DB_URL" =~ $DB_REGEX ]]; then
            EXISTING_DB_USER="${BASH_REMATCH[1]}"
            EXISTING_DB_PASSWORD="${BASH_REMATCH[2]}"
            EXISTING_DB_HOST="${BASH_REMATCH[3]}"
            EXISTING_DB_PORT="${BASH_REMATCH[4]}"
            EXISTING_DB_NAME="${BASH_REMATCH[5]}"
        fi
    fi
    
    # Extract Redis details from REDIS_URL if present
    if [ -n "$EXISTING_REDIS_URL" ]; then
        # Parse redis://:pass@host:port or redis://host:port
        if [[ "$EXISTING_REDIS_URL" =~ redis://:([^@]+)@([^:]+):([0-9]+) ]]; then
            EXISTING_REDIS_PASSWORD="${BASH_REMATCH[1]}"
            EXISTING_REDIS_HOST="${BASH_REMATCH[2]}"
            EXISTING_REDIS_PORT="${BASH_REMATCH[3]}"
        elif [[ "$EXISTING_REDIS_URL" =~ redis://([^:]+):([0-9]+) ]]; then
            EXISTING_REDIS_PASSWORD=""
            EXISTING_REDIS_HOST="${BASH_REMATCH[1]}"
            EXISTING_REDIS_PORT="${BASH_REMATCH[2]}"
        fi
    fi
    
    read -p "Use existing configuration? (y/n) [y]: " USE_EXISTING
    USE_EXISTING=${USE_EXISTING:-y}
    
    if [ "$USE_EXISTING" = "y" ] || [ "$USE_EXISTING" = "Y" ]; then
        print_info "Using existing values as defaults (you can change them)"
        SKIP_CONFIG=false
        SHOW_DEFAULTS=true
    else
        print_info "Starting fresh configuration"
        SKIP_CONFIG=false
        SHOW_DEFAULTS=false
    fi
else
    SKIP_CONFIG=false
    SHOW_DEFAULTS=false
fi

# Step 3: Docker Networks
print_header "Step 3: Docker Networks"

read -p "Enter Docker networks (comma-separated) [${EXISTING_NETWORKS:-proxy,bridge}]: " NETWORKS_INPUT
NETWORKS_INPUT=${NETWORKS_INPUT:-${EXISTING_NETWORKS:-proxy,bridge}}

IFS=',' read -ra NETWORKS_ARRAY <<< "$NETWORKS_INPUT"
for network in "${NETWORKS_ARRAY[@]}"; do
    network=$(echo "$network" | xargs)
    if [ "$network" = "bridge" ]; then
        continue
    fi
    
    if docker network inspect "$network" &> /dev/null; then
        print_info "Network '$network' exists"
    else
        print_step "Creating network: $network"
        docker network create "$network"
        print_success "Network '$network' created"
    fi
done

# Step 4: Database Configuration
print_header "Step 4: Database"

print_info "PostgreSQL connection details"
read -p "Host [${EXISTING_DB_HOST}]: " DB_HOST
DB_HOST=${DB_HOST:-${EXISTING_DB_HOST}}
read -p "Port [${EXISTING_DB_PORT:-5432}]: " DB_PORT
DB_PORT=${DB_PORT:-${EXISTING_DB_PORT:-5432}}
read -p "Database [${EXISTING_DB_NAME:-vlab}]: " DB_NAME
DB_NAME=${DB_NAME:-${EXISTING_DB_NAME:-vlab}}
read -p "User [${EXISTING_DB_USER:-vlab}]: " DB_USER
DB_USER=${DB_USER:-${EXISTING_DB_USER:-vlab}}
if [ -n "$EXISTING_DB_PASSWORD" ]; then
    read -sp "Password [use existing]: " DB_PASSWORD
    echo ""
    DB_PASSWORD=${DB_PASSWORD:-${EXISTING_DB_PASSWORD}}
else
    read -sp "Password: " DB_PASSWORD
    echo ""
fi

DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Step 5: Redis Configuration
print_header "Step 5: Redis"

print_info "Redis connection details"
read -p "Host [${EXISTING_REDIS_HOST}]: " REDIS_HOST
REDIS_HOST=${REDIS_HOST:-${EXISTING_REDIS_HOST}}
read -p "Port [${EXISTING_REDIS_PORT:-6379}]: " REDIS_PORT
REDIS_PORT=${REDIS_PORT:-${EXISTING_REDIS_PORT:-6379}}
if [ -n "$EXISTING_REDIS_PASSWORD" ]; then
    read -p "Password [use existing] (empty for none): " REDIS_PASSWORD
    REDIS_PASSWORD=${REDIS_PASSWORD:-${EXISTING_REDIS_PASSWORD}}
else
    read -p "Password (empty for none): " REDIS_PASSWORD
fi

if [ -n "$REDIS_PASSWORD" ]; then
    REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}"
else
    REDIS_URL="redis://${REDIS_HOST}:${REDIS_PORT}"
fi

# Step 6: vLab Internal Network
print_header "Step 6: vLab Internal Network"

VLAB_NETWORK="vlab"

# Create internal network for vlab services communication (guacd, containerlab, etc)
if docker network inspect "$VLAB_NETWORK" &> /dev/null; then
    print_info "Network '$VLAB_NETWORK' exists"
else
    print_step "Creating network: $VLAB_NETWORK"
    docker network create "$VLAB_NETWORK"
    print_success "Network '$VLAB_NETWORK' created"
fi

# Step 7: Guacamole Daemon (guacd)
print_header "Step 7: Guacamole Daemon"

GUACD_CONTAINER="guacd"

# Check if guacd container exists
if docker ps -a --format '{{.Names}}' | grep -q "^${GUACD_CONTAINER}$"; then
    # Container exists, check if it's running
    if docker ps --format '{{.Names}}' | grep -q "^${GUACD_CONTAINER}$"; then
        print_success "guacd container running"
        
        # Ensure it's connected to vlab network
        if ! docker network inspect "$VLAB_NETWORK" | grep -q "\"$GUACD_CONTAINER\""; then
            print_step "Connecting guacd to vlab network..."
            docker network connect "$VLAB_NETWORK" "$GUACD_CONTAINER" 2>/dev/null || true
        fi
    else
        print_step "Starting guacd container..."
        docker start "$GUACD_CONTAINER"
        
        # Ensure vlab network connection
        if ! docker network inspect "$VLAB_NETWORK" | grep -q "\"$GUACD_CONTAINER\""; then
            docker network connect "$VLAB_NETWORK" "$GUACD_CONTAINER" 2>/dev/null || true
        fi
        print_success "guacd container started"
    fi
else
    # Detect platform architecture
    HOST_ARCH=$(uname -m)
    BUILD_REQUIRED=false
    
    case "$HOST_ARCH" in
        x86_64)
            GUACD_IMAGE="guacamole/guacd:latest"
            print_info "Using official image for amd64"
            ;;
        aarch64|arm64)
            BUILD_REQUIRED=true
            print_warning "ARM64 detected - official image not available"
            ;;
        armv7l)
            BUILD_REQUIRED=true
            print_warning "ARMv7 detected - official image not available"
            ;;
        *)
            GUACD_IMAGE="guacamole/guacd:latest"
            print_warning "Unknown arch: $HOST_ARCH, trying official image"
            ;;
    esac
    
    # Build guacd from source if required
    if [ "$BUILD_REQUIRED" = true ]; then
        # Check if image already exists
        if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^guacd-local:latest$"; then
            print_info "Using existing locally-built guacd image"
            GUACD_IMAGE="guacd-local:latest"
        else
            print_step "Building guacd from source (this may take 5-10 minutes)..."
            
            # Create temporary build directory
            BUILD_DIR=$(mktemp -d)
            cd "$BUILD_DIR"
            
            print_step "Cloning guacamole-server repository..."
            if ! git clone --depth 1 https://github.com/apache/guacamole-server.git; then
                print_error "Failed to clone repository"
                rm -rf "$BUILD_DIR"
                exit 1
            fi
            
            cd guacamole-server
            
            print_step "Building Docker image..."
            if docker build -t guacd-local:latest .; then
                print_success "guacd image built successfully"
                GUACD_IMAGE="guacd-local:latest"
            else
                print_error "Failed to build guacd image"
                cd "$DEPLOY_PATH"
                rm -rf "$BUILD_DIR"
                exit 1
            fi
            
            # Cleanup
            cd "$DEPLOY_PATH"
            rm -rf "$BUILD_DIR"
        fi
    fi
    
    # Create and start guacd container
    print_step "Creating guacd container..."
    docker run -d \
        --name "$GUACD_CONTAINER" \
        --network "$VLAB_NETWORK" \
        --restart unless-stopped \
        "$GUACD_IMAGE"
    
    # Wait for container to be fully initialized
    print_step "Waiting for container initialization..."
    sleep 3
    
    print_success "guacd container created and started"
fi

# Verify guacd is healthy
print_step "Verifying guacd..."
sleep 2
if docker ps --filter "name=^${GUACD_CONTAINER}$" --filter "status=running" | grep -q "$GUACD_CONTAINER"; then
    print_success "guacd is healthy"
else
    print_warning "guacd may not be healthy, check logs: docker logs $GUACD_CONTAINER"
fi

# Step 8: Containerlab API Server (DinD)
print_header "Step 8: Containerlab API Server"

CLAB_REPO_PATH="$DEPLOY_PATH/clab-api-server"

# Check if containerlab is already running
if docker ps --filter "name=clab-api" --format "{{.Names}}" | grep -q "clab-api"; then
    print_success "Containerlab API server already running"
    
    # Ensure it's connected to vlab network
    ACTUAL_CONTAINER_NAME=$(docker ps --filter "name=clab-api" --format "{{.Names}}" | head -1)
    if ! docker network inspect "$VLAB_NETWORK" | grep -q "\"$ACTUAL_CONTAINER_NAME\""; then
        print_step "Connecting API server to vlab network..."
        docker network connect "$VLAB_NETWORK" "$ACTUAL_CONTAINER_NAME" 2>/dev/null || true
    fi
elif docker ps -a --filter "name=clab-api" --format "{{.Names}}" | grep -q "clab-api"; then
    print_warning "Found stopped Containerlab containers. Cleaning up..."
    
    if [ -d "$CLAB_REPO_PATH" ]; then
        cd "$CLAB_REPO_PATH"
        print_step "Stopping and removing old containers..."
        ./clab-api-manager.sh dind stop 2>/dev/null || true
        
        # Force remove any stuck containers
        docker ps -a --filter "name=clab-api" --format "{{.Names}}" | xargs -r docker rm -f 2>/dev/null || true
        docker ps -a --filter "name=dind" --format "{{.Names}}" | xargs -r docker rm -f 2>/dev/null || true
        
        cd "$DEPLOY_PATH"
    else
        print_step "Removing containers manually..."
        docker ps -a --filter "name=clab-api" --format "{{.Names}}" | xargs -r docker rm -f 2>/dev/null || true
        docker ps -a --filter "name=dind" --format "{{.Names}}" | xargs -r docker rm -f 2>/dev/null || true
    fi
    
    print_info "Starting fresh setup..."
else
    print_step "Setting up Containerlab API server with DinD..."
    
    # Define repository path
    CLAB_REPO_PATH="$DEPLOY_PATH/clab-api-server"
    
    # Clone or update repository
    if [ ! -d "$CLAB_REPO_PATH" ]; then
        print_step "Cloning clab-api-server repository..."
        if ! git clone https://github.com/srl-labs/clab-api-server.git "$CLAB_REPO_PATH"; then
            print_error "Failed to clone repository"
            exit 1
        fi
    else
        print_info "Repository already exists at $CLAB_REPO_PATH"
        cd "$CLAB_REPO_PATH"
        print_step "Pulling latest changes..."
        git pull origin main 2>/dev/null || print_warning "Could not pull latest changes, using existing version"
        git reset --hard
        cd "$DEPLOY_PATH"
    fi
    
    cd "$CLAB_REPO_PATH"
    
    # Restore compose file from backup if it exists (in case of previous corruption)
    if [ -f docker/dind/docker-compose.yml.backup ]; then
        print_step "Restoring docker-compose.yml from backup..."
        cp docker/dind/docker-compose.yml.backup docker/dind/docker-compose.yml
    else
        # Create backup on first run
        cp docker/dind/docker-compose.yml docker/dind/docker-compose.yml.backup
    fi
    
    # Fix Dockerfile template path issue
    print_step "Patching Dockerfile..."
    sed -i 's|templates/redoc.html|internal/templates/redoc.html|g' docker/dind/Dockerfile
    sed -i 's|cp -r templates/redoc.html /templates/|cp -r internal/templates/redoc.html /templates/|g' docker/dind/Dockerfile
    
    # Fix entrypoint to clean up stale PID file
    print_step "Patching entrypoint script to clean stale PID files..."
    if ! grep -q "rm -f /var/run/docker.pid" docker/dind/entrypoint.sh; then
        # Add cleanup right after sourcing common functions
        sed -i '/# Source common functions/a\
\
# Clean up any stale PID file from previous runs\
rm -f /var/run/docker.pid /var/run/docker/*.pid 2>/dev/null || true' docker/dind/entrypoint.sh
    fi
    
    # Create a patched docker-compose.yml
    print_step "Patching docker-compose.yml..."
    python3 - <<'PYEOF'
import yaml
import sys

with open('docker/dind/docker-compose.yml', 'r') as f:
    compose = yaml.safe_load(f)

# Remove ports
if 'services' in compose and 'clab-api' in compose['services']:
    service = compose['services']['clab-api']
    if 'ports' in service:
        del service['ports']
    
    # Add environment variables
    if 'environment' not in service:
        service['environment'] = []
    env_vars = ['DOCKER_TLS_CERTDIR=', 'DOCKER_DRIVER=overlay2']
    for var in env_vars:
        if var not in service['environment']:
            service['environment'].append(var)
    
    # Set cgroup namespace to host (requires Compose 2.15.0+)
    service['cgroup'] = 'host'
    
    # Add cgroup mount to volumes
    if 'volumes' not in service:
        service['volumes'] = []
    
    # Add .env file mount - mount from docker/common/.env to /app/.env
    env_mount = '../common/.env:/app/.env:ro'
    if env_mount not in service['volumes']:
        service['volumes'].append(env_mount)

# Add vlab network
if 'networks' not in compose:
    compose['networks'] = {}
compose['networks']['default'] = {
    'name': 'vlab',
    'external': True
}

with open('docker/dind/docker-compose.yml', 'w') as f:
    yaml.dump(compose, f, default_flow_style=False, sort_keys=False)

print("docker-compose.yml patched successfully")
PYEOF

    if [ $? -ne 0 ]; then
        print_error "Failed to patch docker-compose.yml"
        exit 1
    fi
    
    # Check if .env already exists
    if [ ! -f "docker/common/.env" ]; then
        print_step "Creating configuration file..."
        cp docker/common/.env.example docker/common/.env
        
        # Generate JWT secret
        CLAB_JWT_SECRET=$(openssl rand -hex 32)
        
        # Update the .env file with our settings
        sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$CLAB_JWT_SECRET/" docker/common/.env
        sed -i "s/^API_SERVER_HOST=.*/API_SERVER_HOST=$CONTAINERLAB_CONTAINER/" docker/common/.env
        sed -i "s/^API_PORT=.*/API_PORT=8080/" docker/common/.env
        sed -i "s/^LOG_LEVEL=.*/LOG_LEVEL=info/" docker/common/.env
        
        print_success "Configuration file created"
    else
        print_info "Using existing configuration file"
    fi
    
    print_step "Starting Containerlab API server with DinD..."
    
    # Force rebuild to apply patches
    print_step "Building image with patches..."
    if docker compose -f docker/dind/docker-compose.yml build --no-cache; then
        print_success "Image built successfully"
    else
        print_error "Failed to build image"
        cd "$DEPLOY_PATH"
        exit 1
    fi
    
    if ./clab-api-manager.sh dind start; then
        print_success "Containerlab API server started successfully"
        
        # Connect to vlab network if not already connected
        sleep 3
        ACTUAL_CONTAINER_NAME=$(docker ps --filter "name=clab-api" --format "{{.Names}}" | head -1)
        if [ -n "$ACTUAL_CONTAINER_NAME" ]; then
            if ! docker network inspect "$VLAB_NETWORK" | grep -q "\"$ACTUAL_CONTAINER_NAME\""; then
                print_step "Connecting API server to vlab network..."
                docker network connect "$VLAB_NETWORK" "$ACTUAL_CONTAINER_NAME" 2>/dev/null || true
            fi
        fi
    else
        print_error "Failed to start Containerlab API server"
        cd "$DEPLOY_PATH"
        exit 1
    fi
    
    cd "$DEPLOY_PATH"
fi

# Verify containerlab API server is healthy
print_step "Verifying containerlab API server..."
sleep 2

ACTUAL_CONTAINER_NAME=$(docker ps --filter "name=clab-api" --format "{{.Names}}" | head -1)
if [ -n "$ACTUAL_CONTAINER_NAME" ] && docker ps --filter "name=clab-api" --filter "status=running" | grep -q "clab-api"; then
    print_success "Containerlab API server is healthy"
    print_info "Container: $ACTUAL_CONTAINER_NAME"
    print_info "API available at: http://${ACTUAL_CONTAINER_NAME}:8080"
    print_info "Swagger UI: http://${ACTUAL_CONTAINER_NAME}:8080/swagger/index.html"
    
    # Set container name for .env file
    CONTAINERLAB_CONTAINER="$ACTUAL_CONTAINER_NAME"
else
    print_warning "Containerlab API server may not be healthy"
    if [ -d "$CLAB_REPO_PATH" ]; then
        print_info "Check logs: cd $CLAB_REPO_PATH && ./clab-api-manager.sh dind logs"
    fi
fi

# Step 9: Application Configuration
print_header "Step 9: Application"

read -p "Domain/URL [${EXISTING_BASE_URL}]: " BASE_URL
BASE_URL=${BASE_URL:-${EXISTING_BASE_URL}}
read -p "CAS server URL [${EXISTING_CAS_URL}]: " CAS_BASE_URL
CAS_BASE_URL=${CAS_BASE_URL:-${EXISTING_CAS_URL}}

print_info "Leave port empty if using nginx-proxy"
read -p "Bind port [${EXISTING_BIND_PORT}]: " BIND_PORT
BIND_PORT=${BIND_PORT:-${EXISTING_BIND_PORT}}

read -p "Session TTL seconds [${EXISTING_SESSION_TTL:-10800}]: " SESSION_TTL
SESSION_TTL=${SESSION_TTL:-${EXISTING_SESSION_TTL:-10800}}

# Step 10: S3 Configuration (Optional)
print_header "Step 10: S3 Storage"

print_info "S3-compatible storage configuration (leave empty to skip)"
print_info "Note: Endpoint should include bucket name, e.g., http://localhost:9000/vlab"
read -p "S3 Access Key [${EXISTING_S3_ACCESS_KEY}]: " S3_ACCESS_KEY
S3_ACCESS_KEY=${S3_ACCESS_KEY:-${EXISTING_S3_ACCESS_KEY}}

if [ -n "$S3_ACCESS_KEY" ]; then
    if [ -n "$EXISTING_S3_SECRET_KEY" ]; then
        read -sp "S3 Secret Key [use existing]: " S3_SECRET_KEY
        echo ""
        S3_SECRET_KEY=${S3_SECRET_KEY:-${EXISTING_S3_SECRET_KEY}}
    else
        read -sp "S3 Secret Key: " S3_SECRET_KEY
        echo ""
    fi
    
    read -p "S3 Endpoint with bucket (e.g., http://localhost:9000/vlab) [${EXISTING_S3_ENDPOINT}]: " S3_ENDPOINT
    S3_ENDPOINT=${S3_ENDPOINT:-${EXISTING_S3_ENDPOINT}}
    
    print_success "S3 configuration set"
else
    print_info "Skipping S3 configuration"
    S3_SECRET_KEY=""
    S3_ENDPOINT=""
fi

# Step 11: nginx-proxy Configuration
print_header "Step 11: Reverse Proxy"

read -p "Using nginx-proxy? (y/n) [${EXISTING_VIRTUAL_HOST:+y}${EXISTING_VIRTUAL_HOST:-n}]: " USE_NGINX_PROXY
USE_NGINX_PROXY=${USE_NGINX_PROXY:-${EXISTING_VIRTUAL_HOST:+y}}
USE_NGINX_PROXY=${USE_NGINX_PROXY:-n}

if [ "$USE_NGINX_PROXY" = "y" ] || [ "$USE_NGINX_PROXY" = "Y" ]; then
    DEFAULT_VHOST="${BASE_URL#https://}"
    DEFAULT_VHOST="${DEFAULT_VHOST#http://}"
    read -p "Virtual host [${EXISTING_VIRTUAL_HOST:-$DEFAULT_VHOST}]: " VIRTUAL_HOST
    VIRTUAL_HOST=${VIRTUAL_HOST:-${EXISTING_VIRTUAL_HOST:-$DEFAULT_VHOST}}
    
    read -p "Enable Let's Encrypt? (y/n) [${EXISTING_LETSENCRYPT_EMAIL:+y}${EXISTING_LETSENCRYPT_EMAIL:-n}]: " USE_LETSENCRYPT
    USE_LETSENCRYPT=${USE_LETSENCRYPT:-${EXISTING_LETSENCRYPT_EMAIL:+y}}
    USE_LETSENCRYPT=${USE_LETSENCRYPT:-n}
    
    if [ "$USE_LETSENCRYPT" = "y" ] || [ "$USE_LETSENCRYPT" = "Y" ]; then
        read -p "Email for Let's Encrypt [${EXISTING_LETSENCRYPT_EMAIL}]: " LETSENCRYPT_EMAIL
        LETSENCRYPT_EMAIL=${LETSENCRYPT_EMAIL:-${EXISTING_LETSENCRYPT_EMAIL}}
    fi
else
    VIRTUAL_HOST=""
fi

# Step 12: Create .env file
print_header "Step 12: Creating .env"

# Combine networks and avoid duplicates
if [[ ",$NETWORKS_INPUT," == *",$VLAB_NETWORK,"* ]]; then
    FINAL_NETWORKS="$NETWORKS_INPUT"
else
    FINAL_NETWORKS="$NETWORKS_INPUT,$VLAB_NETWORK"
fi

cat > "$DEPLOY_PATH/.env" << EOF
# vLab Production Environment
# Updated: $(date +%Y-%m-%d)

DATABASE_URL=$DATABASE_URL
REDIS_URL=$REDIS_URL
DOCKER_NETWORKS=$FINAL_NETWORKS
EOF

if [ -n "$BIND_PORT" ]; then
    echo "BIND_PORT=$BIND_PORT" >> "$DEPLOY_PATH/.env"
else
    echo "# BIND_PORT=" >> "$DEPLOY_PATH/.env"
fi

cat >> "$DEPLOY_PATH/.env" << EOF
SESSION_TTL=$SESSION_TTL
BATCH_SIZE=100
DEBOUNCE_MS=100
MAX_BATCH_WAIT_MS=500
NODE_ENV=production
BASE_URL=$BASE_URL
CAS_BASE_URL=$CAS_BASE_URL
COOKIE_SECRET=$(openssl rand -hex 32)
GUACD_HOST=$GUACD_CONTAINER
GUACD_PORT=4822
GUACD_SECRET=$(openssl rand -hex 32)
CONTAINERLAB_API_URL=http://$CONTAINERLAB_CONTAINER:8080
EOF

# Add S3 configuration if provided
if [ -n "$S3_ACCESS_KEY" ]; then
    cat >> "$DEPLOY_PATH/.env" << EOF
S3_ACCESS_KEY=$S3_ACCESS_KEY
S3_SECRET_KEY=$S3_SECRET_KEY
S3_ENDPOINT=$S3_ENDPOINT
EOF
else
    cat >> "$DEPLOY_PATH/.env" << EOF
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_ENDPOINT=
EOF
fi

# Add CLAB configuration
# Using default credentials since API_PASS_BUILDTIME is not set in clab-api-server
cat >> "$DEPLOY_PATH/.env" << EOF
CLAB_HOST=$CONTAINERLAB_CONTAINER
CLAB_USERNAME=admin
CLAB_PASSWORD=admin
EOF

if [ -n "$VIRTUAL_HOST" ]; then
    cat >> "$DEPLOY_PATH/.env" << EOF
VIRTUAL_HOST_MULTIPORTS={"$VIRTUAL_HOST":{"/":{"port":3000},"/display":{"port":8080,"dest":"/"}}}
EOF
    
    if [ "$USE_LETSENCRYPT" = "y" ] || [ "$USE_LETSENCRYPT" = "Y" ]; then
        cat >> "$DEPLOY_PATH/.env" << EOF
LETSENCRYPT_HOST=$VIRTUAL_HOST
LETSENCRYPT_EMAIL=$LETSENCRYPT_EMAIL
EOF
    fi
fi

print_success ".env created"

# Step 13: SSH Key
print_header "Step 13: SSH Key"

SSH_KEY_PATH="$HOME/.ssh/vlab_deploy"

if [ -f "$SSH_KEY_PATH" ]; then
    print_info "SSH key exists"
    read -p "Use existing? (y/n) [y]: " USE_EXISTING
    USE_EXISTING=${USE_EXISTING:-y}
    
    if [ "$USE_EXISTING" != "y" ] && [ "$USE_EXISTING" != "Y" ]; then
        SSH_KEY_PATH="$HOME/.ssh/vlab_deploy_$(date +%s)"
        print_step "Creating new key..."
        ssh-keygen -t ed25519 -f "$SSH_KEY_PATH" -N "" -C "vlab-github-actions"
    fi
else
    print_step "Creating SSH key..."
    ssh-keygen -t ed25519 -f "$SSH_KEY_PATH" -N "" -C "vlab-github-actions"
fi

# Add public key to authorized_keys
print_step "Adding to authorized_keys..."
mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"
cat "${SSH_KEY_PATH}.pub" >> "$HOME/.ssh/authorized_keys"
chmod 600 "$HOME/.ssh/authorized_keys"

print_success "SSH key ready"

# Step 14: Generate GitHub Secrets
print_header "Step 14: GitHub Config"

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

print_header "📋 GitHub Secrets"

echo -e "${CYAN}Settings → Secrets and variables → Actions${NC}\n"

echo -e "${YELLOW}VPS_HOST${NC}"
echo -e "${MAGENTA}$VPS_IP${NC}\n"

echo -e "${YELLOW}VPS_USERNAME${NC}"
echo -e "${MAGENTA}$VPS_USER${NC}\n"

echo -e "${YELLOW}VPS_SSH_KEY${NC}"
echo -e "${CYAN}(Private key for SSH access to VPS)${NC}"
cat "$SSH_KEY_PATH"
echo ""

echo -e "${YELLOW}VPS_PORT${NC}"
echo -e "${MAGENTA}$SSH_PORT${NC}\n"

echo -e "${YELLOW}VPS_DEPLOY_PATH${NC}"
echo -e "${MAGENTA}$DEPLOY_PATH${NC}\n"

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
        print_warning "Unknown arch: $VPS_ARCH, using linux/amd64"
        ;;
esac

# Variables section
print_header "📋 GitHub Variables"

echo -e "${CYAN}Settings → Secrets and variables → Actions → Variables${NC}\n"

echo -e "${YELLOW}DOCKER_PLATFORMS${NC}"
echo -e "${MAGENTA}$DOCKER_PLATFORM${NC} ${CYAN}(detected: $VPS_ARCH)${NC}\n"

# Summary
print_header "📝 Summary"

# Get actual containerlab container name
CLAB_CONTAINER_NAME=$(docker ps --filter "name=clab-api" --format "{{.Names}}" | head -1)
CLAB_CONTAINER_NAME=${CLAB_CONTAINER_NAME:-containerlab-api-server}

echo -e "${CYAN}Deploy:${NC} $DEPLOY_PATH"
echo -e "${CYAN}Architecture:${NC} $VPS_ARCH"
echo -e "${CYAN}Networks:${NC} $FINAL_NETWORKS"
echo -e "${CYAN}Database:${NC} ${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo -e "${CYAN}Redis:${NC} ${REDIS_HOST}:${REDIS_PORT}"
echo -e "${CYAN}Guacd:${NC} ${GUACD_CONTAINER}:4822 (container)"
echo -e "${CYAN}Containerlab API:${NC} ${CLAB_CONTAINER_NAME}:8080 (container)"
echo -e "${CYAN}URL:${NC} $BASE_URL"
if [ -n "$BIND_PORT" ]; then
    echo -e "${CYAN}Port:${NC} $BIND_PORT:3000"
fi
if [ -n "$VIRTUAL_HOST" ]; then
    echo -e "${CYAN}VHost:${NC} $VIRTUAL_HOST"
fi
echo ""

print_header "🚀 Next Steps"

echo -e "${CYAN}1.${NC} Add GitHub Secrets (shown above)"
echo -e "   ${CYAN}→${NC} Settings → Secrets and variables → Actions → Secrets"
echo -e "${CYAN}2.${NC} Add GitHub Variables (shown above)"
echo -e "   ${CYAN}→${NC} Settings → Secrets and variables → Actions → Variables"
echo -e "${CYAN}3.${NC} Push to main: ${YELLOW}git push origin main${NC}"
echo -e "${CYAN}4.${NC} Monitor: ${YELLOW}github.com/YOUR_REPO/actions${NC}"

if [ "$USE_NGINX_PROXY" = "y" ] || [ "$USE_NGINX_PROXY" = "Y" ]; then
    echo -e "\n${YELLOW}Note: Ensure nginx-proxy is running before deployment${NC}"
fi

echo ""
print_info "Config: $DEPLOY_PATH/.env"
print_info "SSH key: $SSH_KEY_PATH"
print_warning "Keep SSH key secure!"
echo ""
print_success "Done! 🎉"
