# Docker Swarm (All-in-One) Deployment

This guide explains how to deploy the entire vLab stack using Docker Swarm. This "All-in-One" method provisions the vLab manager, workers, reverse proxy (with automated Let's Encrypt SSL), and backing services (PostgreSQL, Redis, RustFS) in a single, cohesive stack.

## Architecture & Constraints

In this setup, we utilize Docker Swarm's orchestration. However, because services like PostgreSQL and RustFS require persistent storage, they are constrained to the manager node. 

The `docker-compose.yml` strictly enforces this with placement constraints:

```yaml
deploy:
  placement:
    constraints:
      - node.role == manager
```

This prevents Docker Swarm from migrating stateful containers to worker nodes, ensuring they never lose access to their local disk volumes.

### The Reverse Proxy

The stack uses an automated reverse proxy and SSL companion (via the `nginx-proxy` 3-service setup). 

> [!IMPORTANT]
> **Proxy Configuration Constraint**
> 
> Because vLab consists of a main web interface and a Guacamole display component running on different ports, the proxy requires a specific multi-port configuration format. 
> 
> In your `.env.manager`, the `VIRTUAL_HOST_MULTIPORTS` variable must be formatted like this:
> `{"vlab.example.com":{"/":{"port":3000},"/display":{"port":8080,"dest":"/"}}}`

## Automated Deployment

We provide an interactive deployment script that initializes Swarm, prompts for your configuration, and deploys the stack.

Run the following on your **manager node**:

```bash
curl -fsSL https://raw.githubusercontent.com/nunu27/vlab-bun/main/scripts/deploy/deploy-swarm.sh | bash
```

The script will:
1. Initialize Docker Swarm if it's not active.
2. Prompt for database credentials, proxy domain, and secrets.
3. Automatically configure `.env.manager`.
4. Download the `docker-compose.yml` and `nginx.tmpl` files.
5. Deploy the `vlab` stack.

### Adding Worker Nodes

After the deploy script finishes, it will output a `docker swarm join` command. On each **worker node**, install Docker and join the Swarm: that's it.

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh

# 2. Join the Swarm
docker swarm join --token <WORKER_TOKEN> --advertise-addr <WORKER_PUBLIC_IP> <MANAGER_PUBLIC_IP>:2377
```

The `worker-installer` Swarm service (`mode: global`) automatically runs on every node. Once the node joins, Swarm schedules the installer on it. The installer:
1. Resolves the manager's address via Swarm DNS.
2. Discovers the local guacd IP on the `clab-mgmt` overlay.
3. Creates the `vlab-topologies` volume on the node.
4. Starts the vLab worker as a standalone `--privileged` container.
5. Monitors the worker; if it exits, the installer exits too, triggering a Swarm restart that relaunches the worker.

> [!NOTE]
> The worker runs as a standalone `docker run --privileged` container (not a Swarm service) because containerlab requires `--privileged` to configure kernel networking parameters, which Docker Swarm does not support for managed services.

> [!CAUTION]
> **Multi-Cloud & Firewall Requirements**
>
> If your worker nodes are in a different cloud provider or network than your manager (e.g., Manager in Azure, Worker in Oracle Cloud), Docker Swarm's overlay networking will fail silently if firewall ports are blocked. This causes critical errors like `Name resolution failed for target dns:manager:50051`.
>
> You MUST explicitly configure your firewalls (e.g., AWS Security Groups, Azure NSG, Oracle Security Lists) to allow the following traffic:
> - **TCP 2377**: Cluster management. **Inbound** on Manager, **Outbound** from Workers.
> - **TCP & UDP 7946**: Node communication and Gossip (DNS discovery). **Inbound & Outbound** on all nodes.
> - **UDP 4789**: Overlay network traffic (VXLAN). **Inbound & Outbound** on all nodes.
>
> Additionally, when joining a node across the public internet, you must force Swarm to use public IPs by passing the `--advertise-addr` flag.


## Managing the Stack

- **Check status:** `docker stack services vlab`
- **View manager logs:** `docker service logs -f vlab_manager`
- **View installer logs (per node):** `docker service logs -f vlab_worker-installer`
- **View worker logs (on a node):** `docker logs -f vlab-worker`
- **View proxy logs:** `docker service logs -f vlab_nginx-proxy`
- **Remove stack:** `docker stack rm vlab`

> [!WARNING]
> Removing the stack (`docker stack rm vlab`) stops all containers but **preserves** the named volumes (e.g., `postgres-data`, `rustfs-data`, `vlab-topologies`). Your data is safe. To truly wipe data, you would need to manually remove the volumes using `docker volume rm`.

> [!NOTE]
> The `vlab-worker` container is managed by the `worker-installer` Swarm service, not by Swarm directly. To restart the worker on a specific node, restart the installer task: `docker service update --force vlab_worker-installer`.
