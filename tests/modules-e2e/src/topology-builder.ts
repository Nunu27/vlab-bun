import type {
	ContainerlabNodeDefinition,
	ContainerlabTopologyDefinition,
} from "@vlab/clab";
import type { TopologyMarkdown } from "./module-parser";

const TEMPLATE_MAP: Record<
	string,
	{ kind: string; image: string; deviceType: "mikrotik" | "linux" }
> = {
	"Mikrotik RouterOS": {
		kind: "mikrotik_ros",
		image: "ghcr.io/nunu27/vrnetlab/vr-routeros",
		deviceType: "mikrotik",
	},
	"Ubuntu 24.04 SSH": {
		kind: "linux",
		image: "ghcr.io/nunu27/docker-remote-desktop:ssh-ubuntu-24.04",
		deviceType: "linux",
	},
};

export function getDeviceType(
	template: string,
): "mikrotik" | "linux" | "unknown" {
	return TEMPLATE_MAP[template]?.deviceType ?? "unknown";
}

export function buildContainerlabTopology(
	labName: string,
	topology: TopologyMarkdown,
): ContainerlabTopologyDefinition {
	const nodes: Record<string, ContainerlabNodeDefinition> = {};
	const mikrotikNodes: string[] = [];

	for (const [name, device] of Object.entries(topology.devices)) {
		const config = TEMPLATE_MAP[device.template];
		if (!config) {
			throw new Error(`Unknown device template: "${device.template}"`);
		}

		nodes[name] = { kind: config.kind, image: config.image };

		if (config.deviceType === "mikrotik") {
			mikrotikNodes.push(name);
		}
	}

	// Linux nodes wait for all mikrotik nodes to be healthy before starting
	if (mikrotikNodes.length > 0) {
		for (const [name, device] of Object.entries(topology.devices)) {
			const config = TEMPLATE_MAP[device.template];
			if (config?.deviceType !== "linux") continue;

			nodes[name] = {
				...nodes[name],
				stages: {
					create: {
						"wait-for": mikrotikNodes.map((n) => ({
							node: n,
							stage: "healthy",
						})),
					},
				},
			};
		}
	}

	const links = topology.links.map((link) => ({
		endpoints: [
			`${link.from}:${link.interface}`,
			`${link.to}:${link.remoteInterface}`,
		] as readonly [string, string],
	}));

	return {
		name: labName,
		topology: { nodes, links },
	};
}
