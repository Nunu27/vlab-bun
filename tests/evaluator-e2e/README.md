# evaluator-e2e

## Overview

End-to-end tests for the vLab evaluation engine (`@vlab/evaluator`). These tests verify the full evaluation pipeline against live Containerlab topologies, including node health checks, Linux routing table evaluation, MikroTik RouterOS protocol checks, and interface IP verification.

---

## Prerequisites

- [Bun](https://bun.sh) >= 1.3
- [Containerlab](https://containerlab.dev) installed on the host
- Docker daemon running with access to required container images
- A running vLab Manager and Worker (or a compatible test environment)

---

## Setup

Install workspace dependencies from the project root:

```bash
bun install
```

---

## Running Tests

```bash
bun run test
```

> Tests are executed using `bun test` and require a live Containerlab environment. Ensure all topology dependencies are available before running.
