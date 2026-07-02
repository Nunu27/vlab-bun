# Containerlab Integration

At the core of vLab's network emulation capabilities is **[Containerlab](https://containerlab.dev/)**. Containerlab provides a CLI to orchestrate Docker-based network topologies defined by a simple YAML file. vLab wraps this CLI to provide a managed, multi-user lab environment.

## How vLab Uses Containerlab

Instead of users running the `containerlab deploy` CLI command manually, vLab automates the entire process across a cluster of Worker nodes.

### 1. Topology Generation
When an instructor creates a Lab Template in the Manager, they define the topology (nodes, links, image types) either via the UI or by pasting raw YAML. The Manager stores this topology in the database.

### 2. The `@vlab/clab` Package
The `packages/@vlab/clab` package contains TypeScript utilities to safely define, serialize, and manipulate Containerlab topologies programmatically. 

### 3. Worker Execution (`apps/worker`)
When a user starts a lab:
1. The Manager sends the validated lab configuration (nodes, links) to a chosen Worker via gRPC.
2. The Worker (`apps/worker/src/lib/clab.ts`) uses this configuration to programmatically generate a `ContainerlabTopologyDefinition`.
3. The Worker serializes this definition to YAML and writes it to a dedicated topologies directory (`/var/lib/vlab/topologies`).
4. The Worker executes the `containerlab deploy -t <file.yaml>` command.
5. Containerlab spins up the Docker containers and wires up the virtual network interfaces (veth pairs) between them as defined in the topology.

### 4. Telemetry Monitoring (`@vlab/clab-monitor`)
Once the Containerlab topology is running, the Worker uses the `@vlab/clab-monitor` package. This package hooks into the Docker daemon on the Worker host to continuously monitor container health, lifecycle events (start, die), and active network interfaces for the specific containers belonging to that lab session. This state data is then streamed back to the Manager via gRPC.

## Security Considerations
Because Containerlab requires interacting with network namespaces and modifying iptables rules, the Worker daemon must run with elevated privileges (root access and access to the Docker socket). This is the primary reason for the Manager-Worker architectural split: keeping the Manager isolated from the execution environment.
