# vLab Deployment Guide

vLab supports two distinct deployment methods, depending on your needs.

## 1. Docker Swarm (All-in-One)

**[Read the Docker Swarm Guide](./docker-swarm.md)**

This is the recommended approach for most users. It deploys the entire vLab stack—including the API manager, workers, backing services (PostgreSQL, Redis, MinIO), and a reverse proxy with automated SSL—as a single Docker Swarm stack.

**Best for:** Production environments, homelabs, and users who want a simple, one-command deployment.

---

## 2. Manual Deployment

**[Read the Manual Deployment Guide](./manual.md)**

This approach involves running each component (manager, workers, and backing services) as individual, standalone containers without using Docker Swarm orchestration.

**Best for:** Developers, heavily customized environments, or users who already have an established external database and proxy infrastructure they wish to plug into.
