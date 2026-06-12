# vLab Deployment Guide — Docker Swarm

## Table of Contents

1. [How Docker Swarm Works](#1-how-docker-swarm-works)
2. [vLab Swarm Architecture](#2-vlab-swarm-architecture)
3. [Automated Deployment (Recommended)](#3-automated-deployment-recommended)
4. [Manual Deployment](#4-manual-deployment)
5. [Managing the Stack](#5-managing-the-stack)
6. [Scaling & Updates](#6-scaling--updates)
7. [Networking Deep Dive](#7-networking-deep-dive)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. How Docker Swarm Works

Docker Swarm is Docker's built-in container orchestration engine. It turns a pool of Docker hosts into a single logical cluster.

### Key Concepts

| Concept | Description |
|---|---|
| **Node** | A Docker host participating in the swarm. Can be a **manager** or a **worker**. |
| **Manager node** | Maintains cluster state (via Raft consensus), schedules tasks, and exposes the Swarm API. |
| **Worker node** | Executes containers (tasks) assigned by managers. Cannot manage the swarm itself. |
| **Service** | The desired state declaration for a containerized workload (image, replicas, ports, etc.). |
| **Task** | A single running container that is part of a service. |
| **Stack** | A group of related services defined in a `docker-compose.yml` (with `deploy:` keys). |
| **Overlay network** | A virtual network spanning all nodes, allowing containers on different hosts to communicate as if they were local. |

### Manager vs. Worker

```
┌─────────────────────────┐      ┌──────────────────────────┐
│      Manager Node       │      │       Worker Node(s)      │
│                         │      │                          │
│  ┌─────────────────┐    │      │  ┌────────────────────┐  │
│  │  Raft consensus  │◄──┼──────┼─►│   Task executor    │  │
│  │  (cluster state) │   │      │  │   (containers)     │  │
│  └─────────────────┘   │      │  └────────────────────┘  │
│  ┌─────────────────┐   │      │                          │
│  │    Scheduler    │───┼──────►  accepts scheduled tasks  │
│  └─────────────────┘   │      └──────────────────────────┘
└─────────────────────────┘
```

You need an **odd number of managers** for HA (fault tolerance = `(N-1)/2`):
- 1 manager → no fault tolerance (dev/single-node)
- 3 managers → tolerate 1 failure
- 5 managers → tolerate 2 failures

### Service Modes

- **`replicated`** — runs exactly N replica containers, distributed across nodes. Used for stateless services (e.g., the vLab manager API).
- **`global`** — runs exactly **one container per node**. Used for node-level agents (e.g., the vLab worker daemon that manages Containerlab on each host).

### Overlay Networks

Overlay networks are VXLAN-based virtual networks that span the entire swarm. Containers on different physical hosts can reach each other by service name (via Docker's built-in DNS). All swarm traffic is encrypted with AES-128.

```
Node A                          Node B
┌──────────────────────┐       ┌──────────────────────┐
│  [manager container] │       │  [worker container]  │
│       10.0.0.2       │       │      10.0.0.3        │
│         │            │       │         │            │
│    overlay: vlab-network (VXLAN)        │            │
│─────────────────────────────────────────────────────│
│         │            │       │         │            │
│     eth0 (physical)  │       │    eth0 (physical)   │
└──────────────────────┘       └──────────────────────┘
```

---

## 2. vLab Swarm Architecture

vLab maps cleanly to the Swarm model:

```
                         ┌───────────────────────────────────┐
                         │         Docker Swarm Cluster       │
                         │                                   │
  Internet ──► :80/:443  │  ┌──────────────────────────────┐ │
                         │  │        Manager Node          │ │
                         │  │  ┌──────────┐  ┌──────────┐  │ │
                         │  │  │ manager  │  │  worker  │  │ │
                         │  │  │ (API+Web)│  │ (global) │  │ │
                         │  │  └──────────┘  └──────────┘  │ │
                         │  └──────────────────────────────┘ │
                         │                                   │
                         │  ┌──────────────────────────────┐ │
                         │  │        Worker Node 1         │ │
                         │  │  ┌──────────┐  ┌──────────┐  │ │
                         │  │  │  worker  │  │  guacd   │  │ │
                         │  │  │ (global) │  │ (global) │  │ │
                         │  │  └──────────┘  └──────────┘  │ │
                         │  └──────────────────────────────┘ │
                         │              ... (N nodes)        │
                         └───────────────────────────────────┘
```

| Service | Mode | Placement | Purpose |
|---|---|---|---|
| `manager` | `replicated` (1 replica) | `node.role == manager` | Central API + serves the web frontend |
| `worker` | `global` | all nodes | Containerlab provisioner on each host |
| `guacd` | `global` | all nodes | Apache Guacamole daemon for remote access |

**Networks:**
- `vlab-network` — internal overlay for manager ↔ worker gRPC and API communication
- `clab-mgmt` — overlay shared between workers and guacd for lab container access

---

## 3. Automated Deployment (Recommended)

The easiest way to deploy the vLab manager node is using the interactive deployment script. This script will automatically check for Docker, initialize Docker Swarm, prompt for necessary environment variables, optionally set up an `nginx-proxy`, and deploy the stack.

On the **manager node**, simply run:

```bash
curl -fsSL https://raw.githubusercontent.com/nunu27/vlab-bun/main/scripts/deploy.sh | bash
```

The script will handle the initial setup. Once finished, it will display the command needed to join worker nodes to the cluster.

> **Note:** For worker nodes, you must still manually install Docker and Containerlab, and run the `docker swarm join` command provided by the script. See [Worker Node Setup](#worker-node-setup) below.

### Worker Node Setup

On **every worker node**, you need to install Docker and Containerlab:

```bash
# Docker Engine (>= 24.x recommended)
curl -fsSL https://get.docker.com | sh

# Containerlab
bash -c "$(curl -sL https://get.containerlab.dev)"
```

Then, run the `docker swarm join --token ...` command provided by the manager's deployment script.

---

## 4. Manual Deployment

If you prefer to set up the cluster manually or integrate it into an existing automated workflow, follow the steps below.

### 4.1 Prerequisites

On **every node** in the cluster:

```bash
# Docker Engine (>= 24.x recommended)
curl -fsSL https://get.docker.com | sh

# Containerlab (worker nodes only)
bash -c "$(curl -sL https://get.containerlab.dev)"
```

**Firewall ports** that must be open between nodes:

| Port | Protocol | Purpose |
|---|---|---|
| `2377` | TCP | Swarm management (manager nodes) |
| `7946` | TCP + UDP | Inter-node communication |
| `4789` | UDP | Overlay network (VXLAN) |

---

### 4.2 Initializing the Swarm

### On the manager node

```bash
# Replace with the node's actual advertise IP (accessible by other nodes)
docker swarm init --advertise-addr <MANAGER_IP>
```

This outputs a `docker swarm join` command with a token. Save it.

### On each worker node

```bash
docker swarm join --token <WORKER_TOKEN> <MANAGER_IP>:2377
```

### Verify the cluster

```bash
# Run on the manager node
docker node ls
```

Expected output:
```
ID                            HOSTNAME        STATUS    AVAILABILITY   MANAGER STATUS
abc123 *                      manager-node    Ready     Active         Leader
def456                        worker-node-1   Ready     Active
ghi789                        worker-node-2   Ready     Active
```

### (Optional) Promote a node to manager for HA

```bash
docker node promote <NODE_ID>
```

---

### 4.3 Preparing Secrets & Environment

The `docker-compose.yml` uses `env_file: .env.manager` and `env_file: .env.worker` for the respective services. In Swarm, these files must be present on the manager node when deploying, **or** you should use Docker Secrets for sensitive values.

### Option A — Simple env files (dev/single-node)

Ensure you have both `.env.manager` and `.env.worker` on the manager node:

```bash
# Example required variables for .env.manager (adapt to your actual config)
DATABASE_URL=postgres://user:pass@host:5432/vlab
REDIS_URL=redis://host:6379
JWT_SECRET=...
GRPC_PORT=50051

# Example required variables for .env.worker
LOG_LEVEL=debug
```

> **Note:** `env_file` in Swarm stacks reads the files **on the manager node at deploy time** and bakes the values into the service spec. The files do not need to exist on worker nodes.

### Option B — Docker Secrets (production recommended)

```bash
# Create a secret from a file or stdin
echo "my_secret_value" | docker secret create jwt_secret -

# Reference in docker-compose.yml
# services:
#   manager:
#     secrets:
#       - jwt_secret
# secrets:
#   jwt_secret:
#     external: true
```

---

### 4.4 Deploying the Stack

You do **not** need to SSH into the manager to run this command. You can deploy directly from your local machine (or CI) by pointing your Docker client at the remote swarm manager using a Docker context:

```bash
# One-time setup: create a context for the swarm manager
docker context create vlab-swarm --docker "host=ssh://user@<MANAGER_IP>"

# Activate it
docker context use vlab-swarm
```

> **Note:** `docker-compose.yml`, `.env.manager`, and `.env.worker` are read from your **local** machine at deploy time — no need to copy them to the server.

Once the context is active, deploy as normal:

```bash
# Deploy (or update) the stack named "vlab"
docker stack deploy -c docker-compose.yml vlab
```

To run a one-off command without switching context permanently:
```bash
DOCKER_HOST="ssh://user@<MANAGER_IP>" docker stack deploy -c docker-compose.yml vlab
```

### With nginx-proxy (optional)

If you have an existing `nginx-proxy` + `acme-companion` setup, generate a `docker-compose.proxy.yml` override file and deploy with both:

```bash
# docker-compose.proxy.yml — connect manager to proxy network, remove host port bindings
docker stack deploy \
  -c docker-compose.yml \
  -c docker-compose.proxy.yml \
  vlab
```

The override file adds the manager to the proxy's network and sets the required env vars:

```yaml
version: "3.8"

networks:
  proxy-net:
    external: true
    name: nginx-proxy          # your proxy network name

services:
  manager:
    ports: []                  # remove 80/443 — nginx-proxy handles ingress
    networks:
      - vlab-network
      - proxy-net
    environment:
      - VIRTUAL_HOST_MULTIPORTS={"vlab.example.com":{"/":{"port":3000},"/display":{"port":8080,"dest":"/"}}}
      - LETSENCRYPT_HOST=vlab.example.com
      - LETSENCRYPT_EMAIL=admin@example.com
```

> **Bridge network constraint:** Swarm services can only join **overlay** networks, not bridge networks. If your `nginx-proxy` network is a bridge, create a new attachable overlay and connect your proxy containers to it:
> ```bash
> docker network create --driver overlay --attachable nginx-proxy-overlay
> docker network connect nginx-proxy-overlay <nginx-proxy-container>
> docker network connect nginx-proxy-overlay <acme-companion-container>
> ```

*(Note: The automated `deploy.sh` script from section 3 handles all of the above interactively.)*

### Verify deployment

```bash
# List all services in the stack
docker stack services vlab

# Watch task status (live)
docker service ps vlab_manager
docker service ps vlab_worker
docker service ps vlab_guacd
```

Expected `vlab_manager`:
```
ID            NAME               IMAGE                                    NODE           DESIRED STATE   CURRENT STATE
xxxx          vlab_manager.1     ghcr.io/nunu27/vlab-bun-manager:latest   manager-node   Running         Running 2 minutes ago
```

Expected `vlab_worker` (global — one per node):
```
ID            NAME                    IMAGE                                   NODE           DESIRED STATE   CURRENT STATE
xxxx          vlab_worker.abc123      ghcr.io/nunu27/vlab-bun-worker:latest   manager-node   Running         Running 2 minutes ago
xxxx          vlab_worker.def456      ghcr.io/nunu27/vlab-bun-worker:latest   worker-node-1  Running         Running 2 minutes ago
```

---

## 5. Managing the Stack

### View logs

```bash
# Follow manager logs
docker service logs -f vlab_manager

# Follow worker logs (aggregated from all nodes)
docker service logs -f vlab_worker
```

### Inspect a service

```bash
docker service inspect vlab_manager --pretty
```

### Remove the stack

```bash
docker stack rm vlab
```

### Node management

```bash
# Drain a node (gracefully move its tasks away before maintenance)
docker node update --availability drain <NODE_ID>

# Re-activate after maintenance
docker node update --availability active <NODE_ID>

# Remove a node from the swarm (run on the node itself)
docker swarm leave

# Remove it from the manager's view
docker node rm <NODE_ID>
```

---

## 6. Scaling & Updates

### Rolling updates (zero-downtime)

When a new image is pushed, update the service:

```bash
docker service update \
  --image ghcr.io/nunu27/vlab-bun-manager:latest \
  --update-parallelism 1 \
  --update-delay 10s \
  vlab_manager
```

Or simply re-deploy the stack (Swarm will diff and rolling-update changed services):

```bash
docker stack deploy -c docker-compose.yml vlab
```

### Scaling replicated services

The `manager` service is pinned to 1 replica (it holds state). Do **not** scale it unless you add a shared session/state layer (Redis, etc. — which is already in the stack).

```bash
# If you add stateless replicas in the future:
docker service scale vlab_manager=2
```

### Forcing a service restart (pull latest image)

```bash
docker service update --force vlab_manager
```

---

## 7. Networking Deep Dive

### `vlab-network` (overlay, attachable)

- **Scope**: all swarm nodes
- **Members**: `manager`, `worker`, `guacd`
- **Purpose**: gRPC calls from workers to manager (`:50051`), internal API traffic
- `attachable: true` allows non-swarm containers (e.g., manual debugging containers) to join this network

### `clab-mgmt` (overlay, attachable, named)

- **Scope**: all swarm nodes
- **Members**: `worker`, `guacd`
- **Purpose**: Containerlab lab containers are attached to this network, allowing `guacd` to reach lab node consoles (SSH/VNC/RDP) by IP
- Named `clab-mgmt` explicitly (not prefixed with stack name) so that Containerlab-spawned containers can join it by a predictable name

### Service discovery

Within the `vlab-network`, services resolve each other by service name:

```
manager  →  worker:50051   ✗  (workers connect TO the manager)
worker   →  manager:50051  ✓  MANAGER_GRPC_URL=http://manager:50051
guacd    →  <lab-container-ip>  ✓  via clab-mgmt
```

### The `MANAGER_ID` / `WORKER_ID` trick

```yaml
environment:
  - MANAGER_ID={{.Node.ID}}
  - WORKER_ID={{.Node.ID}}
```

Docker Swarm templating (`{{.Node.ID}}`) injects the Swarm node ID at runtime, giving each container instance a stable, unique identity tied to its host.

---

## 8. Troubleshooting

### Service stuck in "Preparing" or "Pending"

```bash
docker service ps vlab_manager --no-trunc
```
Look at the `ERROR` column. Common causes:
- Image pull failure → verify the image name/tag is correct and the package is public
- Placement constraint not satisfied → verify `docker node ls` roles
- Port already in use on the node

### Container exits immediately

```bash
docker service logs vlab_manager --tail 50
```

### Overlay network issues

```bash
# Verify ports 7946 and 4789 are open
# On each node:
netstat -tulpn | grep -E '7946|4789'

# Check network exists on all nodes
docker network ls | grep overlay
```

### Worker can't reach manager gRPC

```bash
# Exec into a worker container and test
docker exec -it $(docker ps -q -f name=vlab_worker) sh
wget -qO- http://manager:50051  # should get a gRPC response or connection refused (not DNS failure)
```

### Re-initializing a broken swarm

```bash
# On manager
docker swarm init --force-new-cluster  # recover from split-brain
```

---

*Last updated: June 2026*
