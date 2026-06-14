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
3. Automatically configure `.env.manager` and `.env.worker`.
4. Download the `docker-compose.yml` and `nginx.tmpl` files.
5. Deploy the `vlab` stack.

### Adding Worker Nodes

After the script finishes, it will provide a `docker swarm join` command. On **every worker node**, you must install Docker and Containerlab, then run that join command.

```bash
# On the worker node:
curl -fsSL https://get.docker.com | sh
bash -c "$(curl -sL https://get.containerlab.dev)"

# Join the swarm using the token from the manager
docker swarm join --token <WORKER_TOKEN> <MANAGER_IP>:2377
```

## Managing the Stack

- **Check status:** `docker stack services vlab`
- **View manager logs:** `docker service logs -f vlab_manager`
- **View proxy logs:** `docker service logs -f vlab_nginx-proxy`
- **Remove stack:** `docker stack rm vlab`

> [!WARNING]
> Removing the stack (`docker stack rm vlab`) stops all containers but **preserves** the named volumes (e.g., `postgres-data`, `rustfs-data`). Your data is safe. To truly wipe data, you would need to manually remove the volumes using `docker volume rm`.
