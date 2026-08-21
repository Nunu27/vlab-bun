# vLab Deployment Guide

vLab supports two distinct deployment methods, depending on your needs.

## 1. Docker Swarm (All-in-One)

**[Read the Docker Swarm Guide](./docker-swarm.md)**

This is the recommended approach for most users. It deploys the entire vLab stack as a single Docker Swarm stack, including the API manager, workers, backing services (PostgreSQL, Redis, MinIO), and a reverse proxy with automated SSL.

**Best for:** Production environments, homelabs, and users who want a simple, one-command deployment.

---

## 2. Manual Deployment

**[Read the Manual Deployment Guide](./manual.md)**

This approach involves running each component (manager, workers, and backing services) as individual, standalone containers without using Docker Swarm orchestration.

**Best for:** Developers, heavily customized environments, or users who already have an established external database and proxy infrastructure they wish to plug into.

---

## 3. Compose (Multi-Host)

**[Read the Compose Guide](./compose.md)**

This approach uses plain `docker compose` (no Swarm) to run multiple manager
replicas across independent hosts, each with its own Cloudflare Tunnel
connector, plus one or more worker hosts, all connected over Tailscale.
Shared state runs on its own host so no single manager or worker VM is a
single point of failure for the application tier.

**Best for:** Production environments that need to survive the loss of an
individual host, where the hosts are spread across independent
machines/providers rather than a single Swarm cluster.
