# The Administrative System

The vLab Admin Dashboard provides foundational master data management. Because the system virtualizes actual Operating Systems via Containerlab, strict governance is required over *what* Docker images can be run and *who* belongs where.

## Deep Dive: Organizational Data Restraints
The platform partitions user access and content visibility heavily.
- **Departments**: The macro-umbrella of the taxonomy. 
- **Study Programs**: Tightly coupled to Departments. 

*Why does this matter?*
When an Instructor creates a lab, they do not manually pick students from a list of thousands. Instead, Instructors link their created Labs to specific Study Programs. A Student authenticated against the platform checks their enrolled Study Program and automatically inherits all Active Labs associated with it. 

## Deep Dive: Anatomy of a Device Template
Because vLab allows Instructors to build completely arbitrary topologies, they cannot be allowed to pull untested or insecure Docker images directly from DockerHub. 
Therefore, Admins must create fully tested **Device Templates**. When an Instructor drops a "Router" node into their Lab, they are actually referencing a Device Template created by an Admin.

An Admin Configured Device Template consists of:

### 1. Fundamental Image Mapping
- **Name**: e.g., `Alpine Basic Network Node`
- **Docker Image**: The actual tag pulled by Containerlab (e.g., `srlabs/network-multitool:latest`).
- **Initialization Script**: The Admin can provide bash scripts that run immediately as the container mounts to install tools (like `ping` or `traceroute`) before the student even sees the terminal.

### 2. Network & Resource Scoping
- **Network Interface Count**: If an Admin sets this to "4", the Instructor can only attach 4 "cables" to this specific node entirely preserving realism (a router with 4 physical ports).
- **Resource Constraints**: Hard caps on RAM (e.g., 512MB) and CPU quotas assigned to the container via Docker control groups to ensure the host machine doesn't crash when 50 students start their sessions simultaneously.

### 3. Remote Connectivity Hooks (Guacamole Proxy)
To allow students to access these nodes from their browser via Apache Guacamole, Admins define exactly how the backend should proxy the connection:
- **Protocol**: Only supports native Remote Desktop Protocols: `ssh`, `telnet`, `rdp`, or `vnc`.
- **Port Mapping**: E.g., The internal Docker container listens on port 22 for SSH.
- **Default Credentials**: The standardized `username` and `password` needed for the Guacamole proxy service to authenticate automatically on behalf of the student without them knowing the actual credentials.
