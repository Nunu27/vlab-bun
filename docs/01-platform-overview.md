# vLab Platform Detailed Overview

**vLab** is an advanced Virtual Laboratory Platform designed to replace traditional hardware labs with scalable, browser-based simulation environments. By removing physical constraints, vLab empowers educational institutions to deploy complex networking, cybersecurity, and system administration laboratories using modern software orchestration.

## Overall Architecture
vLab is structurally divided into two major components housed within a monorepo framework:
1. **The Backend Engine (`@vlab/api`)**: A high-performance API and WebSocket server built natively on Elysia.js. It acts as the "orchestrator," handling all database persistence (via Drizzle ORM/PostgreSQL), communicating with underlying Docker daemons, and pushing real-time evaluation events.
2. **The Frontend Client (`@vlab/web`)**: A reactive, single-page application built with React 19 and TanStack dependencies. It provides distinct interface layers for Admins, Instructors, and Students.

## Deep Dive: The Virtualization Translation Mechanism

The defining characteristic of vLab is its ability to spin up isolated, high-fidelity topologies instantly. This is achieved through a controlled orchestration of **Containerlab** running on top of **Docker**.

### Step 1: The Instructor's Blueprint
In the frontend dashboard, an Instructor visually designs a network topology. They drag nodes (e.g., Node A "Linux Server", Node B "MikroTik Router") into a canvas and connect them with lines representing ethernet cables.

### Step 2: The Translation Layer
When a Student clicks "Start Session" to execute that specific lab:
1. The backend API extracts the Instructor's visual JSON data from PostgreSQL.
2. The `@vlab/clab` service takes this data and dynamically synthesizes a `.clab.yml` topology definition wrapper.
3. This wrapper injects standard Docker Image tags provided by administrative "Device Templates."
4. It defines strict `endpoints` mapping directly to the "cables" drawn by the instructor.

### Step 3: Containerlab Orchestration
The finalized `.clab.yml` is parsed and executed by the host's Containerlab binary via Node.js system subprocesses (`dockerode`).
- Containerlab contacts the local Docker Daemon to spin up the requested isolated containers.
- Containerlab uses Linux `veth` (virtual ethernet pairs) to physically wire the Docker containers together exactly as the Instructor requested, bypassing standard Docker Bridge networks for true Layer 2 realism.
- Once running, the Backend API monitors the topology via WebSocket events, finalizing the student's Session initialization.
