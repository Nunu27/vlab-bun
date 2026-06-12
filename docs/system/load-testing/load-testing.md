# Load Testing

*(Note: Load testing processes are historically documented here. Active load-test scripts might exist in separate branches or repositories, but this document defines the expected strategy).*

## Strategy

Load testing in vLab focuses on two critical bottlenecks in the architecture: Manager concurrent connections and Worker host resource limits.

### 1. Manager Bottlenecks (Connection Scaling)
The Manager acts as the central hub. The primary load testing metric here is concurrent **gRPC/Waycast connections**. 
- **Scenario:** 100 students starting a lab simultaneously.
- **Expectation:** The Manager must be able to sustain 100 incoming gRPC streams from Workers and multiplex those out to 100 WS connections to Web UI clients without dropping telemetry frames or crashing the Elysia API.

### 2. Worker Bottlenecks (Resource Saturation)
The Worker actually spins up the containers. The primary metric here is host **CPU, Memory, and Storage**.
- **Scenario:** The Manager dispatches 20 heavy topologies (e.g., each containing 5 MikroTik RouterOS instances) to a single Worker.
- **Expectation:** The Worker must reliably queue or process the Containerlab deployments. Monitoring should accurately reflect the host's resource saturation to prevent the host from kernel panicking due to out-of-memory (OOM) errors.

## Testing Architecture

When load tests are run, they typically involve mock Workers generating synthetic telemetry data to hammer the Manager, circumventing the need for actual Docker container creation.

*(Please refer to the `load-testing.excalidraw` diagram in this directory for an illustration of mock workers sending gRPC telemetry to the Manager).*
