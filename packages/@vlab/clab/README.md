# @vlab/clab

## Overview

TypeScript wrapper around the Containerlab CLI for Bun projects. It provides a programmatic interface to deploy, destroy, and inspect containerized lab topologies.

## Installation

Add this package as a workspace dependency:

```json
{
  "dependencies": {
    "@vlab/clab": "workspace:*"
  }
}
```

## Key Features

- **Programmatic Wrapper**: Invoke Containerlab commands (`deploy`, `destroy`, `inspect`) directly from TypeScript.
- **Topology Generation**: Automatically writes generated topology files to `<topologiesPath>/<id>/<id>.clab.yml`.
- **Typed Responses**: Parses Containerlab's JSON inspection output into typed TypeScript objects.

## Usage & API Examples

```ts
import Containerlab from "@vlab/clab";

const containerlab = new Containerlab({
	topologiesPath: "/var/lib/vlab/topologies",
});

await containerlab.ready();

const nodes = await containerlab.deploy("session-1", {
	mgmt: {
		network: "vlab-mgmt",
		"ipv4-subnet": "172.100.100.0/24",
	},
	topology: {
		nodes: {
			r1: {
				kind: "linux",
				image: "alpine:latest",
			},
		},
	},
});

await containerlab.destroy("session-1");
```

`deploy` writes a generated topology, forces the topology `name` to the lab ID, and returns `containerlab inspect --format json` data as typed objects.

`destroy` always passes `--keep-mgmt-net --cleanup` and then removes the wrapper-owned lab directory.

## Development & Scripts

Commands:

| Script | Description |
|---|---|
| `bun run typecheck` | Run TypeScript type checks (`tsc --noEmit`) |
