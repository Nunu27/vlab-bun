# containerlab

TypeScript wrapper around the Containerlab CLI for Bun projects.

```ts
import Containerlab from "containerlab";

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

`deploy` writes a generated topology to
`<topologiesPath>/<id>/<id>.clab.yml`, forces the topology `name` to the lab
ID, and returns `containerlab inspect --format json` data as typed objects.

`destroy` always passes `--keep-mgmt-net --cleanup` and then removes the
wrapper-owned lab directory.
