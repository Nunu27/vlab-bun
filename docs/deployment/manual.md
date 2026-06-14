# Manual Deployment

If you prefer not to use Docker Swarm, or if you already have an established infrastructure with existing databases and reverse proxies, you can deploy vLab manually across multiple machines.

In this setup, each component is run as a standalone Docker container. We provide two interactive deployment scripts to simplify this process: one for the manager node and one for your worker nodes.

## Architecture & Connectivity

Manual deployment across multiple nodes means we do not have the luxury of Docker Swarm's "Overlay" networks. Thus, we utilize **Dynamic Guacd Routing**.

Each worker node runs its own instance of `guacd`. The worker registers its public IP with the manager. When a user requests to view a console for a lab on that worker, the manager dynamically routes the Guacamole connection securely to that specific worker's `guacd` instance.

### Network Requirements

Ensure your firewall rules allow the following traffic:

- **Manager Node**:
  - Inbound: `80/443` (Web UI/API via reverse proxy), `8080` (Display/Waycast), `50051` (gRPC from workers).
  - Outbound: DB (`5432`), Redis (`6379`), S3 (`9000`), and access to Worker Nodes (`4822`).
- **Worker Nodes**:
  - Inbound: `4822` (guacd connection from the Manager).
  - Outbound: Manager (`50051`).

---

## 1. Deploying the Manager

First, ensure you have running instances of your backing services (PostgreSQL, Redis, RustFS/S3). These can be hosted anywhere, as long as the Manager node can reach them.

To deploy the manager, run the interactive manual manager script on your primary node:

```bash
curl -fsSL https://raw.githubusercontent.com/nunu27/vlab-bun/main/scripts/deploy/deploy-manager.sh | bash
```

The script will prompt you for:
- Database, Redis, and S3 connection strings.
- Passwords and Secrets.
- It will automatically deploy the `vlab-manager` container on a local `vlab-network` bridge.

---

## 2. Deploying the Workers

The worker daemon requires access to the host's Docker socket and Containerlab. It must be run on a machine with Containerlab installed.

To deploy a worker, run the interactive manual worker script on each worker node:

```bash
curl -fsSL https://raw.githubusercontent.com/nunu27/vlab-bun/main/scripts/deploy/deploy-worker.sh | bash
```

The script will prompt you for:
- **Manager gRPC URL**: E.g., `http://<manager-public-ip>:50051`
- **Guacd Host (`GUACD_HOST`)**: The public IP of the worker node. The manager will use this IP to connect to the worker's `guacd` daemon on port `4822`.

The script will automatically set up the `clab-mgmt` network, start the `vlab-guacd` container (publishing port 4822), and start the `vlab-worker` container.

---

## 3. Reverse Proxy Setup

If using an external reverse proxy (like Nginx, Traefik, or Caddy) in front of the Manager, configure it to route traffic:

- Route `/` (and all other traffic) to the manager's `PORT` (e.g., `3000`).
- Route `/display` to the manager's `DISPLAY_PORT` (e.g., `8080`), stripping the `/display` prefix if necessary depending on your setup.

> [!TIP]
> If you are using `nginx-proxy`, ensure you pass the specific `VIRTUAL_HOST_MULTIPORTS` environment variable to the manager container as detailed in the Docker Swarm guide.
