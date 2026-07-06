# modules-e2e

## Overview

End-to-end tests for vLab lab modules. These tests verify the complete lifecycle of individual lab modules against live Containerlab topologies, including deployment, evaluation, and teardown. Tests can be scoped to a specific module using the `VLAB_MODULE` environment variable.

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

Run all module tests:

```bash
bun run test
```

Run tests for a specific module:

```bash
MODULE=<module-name> bun run test:module
```

> Tests are executed using `bun test` and require a live Containerlab environment. Ensure all topology dependencies are available before running.
