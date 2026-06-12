# Lab Evaluation Engine

The Lab Evaluation Engine is responsible for automatically assessing a student's progress during a lab session. It checks if the student has successfully configured the network according to the instructor's rules.

## Core Package: `@vlab/evaluator`

All logic for defining, parsing, and running evaluation rules lives in the `packages/@vlab/evaluator` package. By keeping this logic in a shared package, both the Manager (which stores the rules) and the Worker (which executes the checks) have access to the exact same evaluation types.

## The Evaluation Flow

1. **Rule Definition:** When an instructor creates a lab, they define a set of Rules in the Manager. A rule might be: "Router A must be able to ping Router B on IP 192.168.1.1".
2. **Dispatch to Worker:** When a student starts a lab session, the Manager sends these Rules to the Worker alongside the Containerlab topology via gRPC.
3. **Execution on Worker:** The Worker (`apps/worker/src/handlers/evaluator.ts`) uses the `@vlab/evaluator` package to run checks. Because the Worker has root access and Docker access, it can:
   - Execute `docker exec` commands inside the student's running containers to check routing tables.
   - Check interface IP configurations.
4. **Scoring & Reporting:** The Worker sends the status (Pass/Fail) of each individual check back to the Manager via gRPC.
5. **Finalization:** The Manager calculates the overall score based on the weighted checks stored in the database, updating both the database and the Web UI in real-time.

## Types of Checks

The Evaluator currently supports several types of checks (defined in `@vlab/evaluator`), tailored for different node types (Linux vs MikroTik):
- **Interface IP Check:** Verifies that a specific network interface has the correct IP address assigned.
- **Routing Checks:** Verifies the existence of specific routes in the routing table (supported on Linux and MikroTik).
- **OSPF Checks:** Verifies OSPF configurations such as Instances, Areas, Interface Templates, and Neighbors (MikroTik).
- **RIP Checks:** Verifies RIP Instances and Interface Templates (MikroTik).
- **BGP Checks:** Verifies BGP Instances (MikroTik).

*(Note: Instructors can combine multiple checks into a single Rule to create complex grading scenarios).*
