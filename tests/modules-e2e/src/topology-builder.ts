import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
	ContainerlabMgmtConfig,
	ContainerlabNodeDefinition,
	ContainerlabTopologyDefinition,
} from "@vlab/clab";
import {
	LINUX_NAME_RESOLUTION_EXECS,
	MIKROTIK_GUARD_CONTENT,
	MIKROTIK_GUARD_FILENAME,
} from "../../../apps/worker/src/constants";
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

/**
 * Mirrors the Linux startup execs the worker applies to real lab sessions
 * (see apps/worker/src/domain/lab/topology.ts).
 *
 * Two things are replicated, both of which the modules' documented commands
 * depend on:
 *
 * 1. Containerlab installs a default route via the management interface, and
 *    production deletes it so a student's `ip route add default via <gateway>`
 *    succeeds.
 * 2. Name resolution, imported from the worker's own constants. Deleting the
 *    default route makes every nameserver unreachable, which is what turns
 *    `tracepath` output into `???`; the worker's nsswitch exec is what stops
 *    it. A harness without this shows different trace output than a real lab.
 *
 * The remaining production execs (guacd host route, shutdown hardening) are
 * deliberately omitted: they need worker config and do not affect routing.
 */
const LINUX_STARTUP_EXECS = [
	"ip route del default",
	...LINUX_NAME_RESOLUTION_EXECS,
];

/**
 * Mirrors the worker's MikroTik `startup-config` (see the same constants in
 * `apps/worker/src/constants.ts`, imported directly so the two cannot drift).
 * It strips the reboot policy and installs the scheduler that keeps `ssh` and
 * `api` alive, so the labs are tested against the same router a student gets.
 */
function writeMikrotikGuard(topologiesPath: string): string {
	const target = join(topologiesPath, MIKROTIK_GUARD_FILENAME);
	writeFileSync(target, MIKROTIK_GUARD_CONTENT);
	return target;
}

/**
 * Containerlab defaults its management network to 172.20.20.0/24, which
 * collides with existing Docker networks on some development machines. These
 * env vars let a developer point the labs at a free range without changing
 * behaviour anywhere the default is fine (CI runners, for instance).
 *
 *   VLAB_MGMT_NETWORK=clab-mgmt
 *   VLAB_MGMT_IPV4_SUBNET=172.30.30.0/24
 *   VLAB_MGMT_IPV6_SUBNET=3fff:172:30:30::/64
 */
function buildMgmtConfig(): ContainerlabMgmtConfig | undefined {
	const network = process.env.VLAB_MGMT_NETWORK;
	const ipv4 = process.env.VLAB_MGMT_IPV4_SUBNET;
	const ipv6 = process.env.VLAB_MGMT_IPV6_SUBNET;

	if (!network && !ipv4 && !ipv6) return undefined;

	return {
		...(network ? { network } : {}),
		...(ipv4 ? { "ipv4-subnet": ipv4 } : {}),
		...(ipv6 ? { "ipv6-subnet": ipv6 } : {}),
	};
}

export function buildContainerlabTopology(
	labName: string,
	topology: TopologyMarkdown,
	topologiesPath?: string,
): ContainerlabTopologyDefinition {
	const nodes: Record<string, ContainerlabNodeDefinition> = {};
	const mikrotikNodes: string[] = [];
	const mgmt = buildMgmtConfig();

	for (const [name, device] of Object.entries(topology.devices)) {
		const config = TEMPLATE_MAP[device.template];
		if (!config) {
			throw new Error(`Unknown device template: "${device.template}"`);
		}

		nodes[name] = { kind: config.kind, image: config.image };

		if (config.deviceType === "mikrotik") {
			mikrotikNodes.push(name);
			if (topologiesPath) {
				nodes[name]["startup-config"] = writeMikrotikGuard(topologiesPath);
			}
		}
	}

	for (const [name, device] of Object.entries(topology.devices)) {
		const config = TEMPLATE_MAP[device.template];
		if (config?.deviceType !== "linux") continue;

		nodes[name] = {
			...nodes[name],
			stages: {
				// Linux nodes wait for all mikrotik nodes to be healthy first.
				...(mikrotikNodes.length > 0
					? {
							create: {
								"wait-for": mikrotikNodes.map((n) => ({
									node: n,
									stage: "healthy",
								})),
							},
						}
					: {}),
				configure: {
					exec: LINUX_STARTUP_EXECS.map((command) => ({
						command,
						target: "container" as const,
						phase: "on-exit" as const,
					})),
				},
			},
		};
	}

	const links = topology.links.map((link) => ({
		endpoints: [
			`${link.from}:${link.interface}`,
			`${link.to}:${link.remoteInterface}`,
		] as readonly [string, string],
	}));

	return {
		name: labName,
		...(mgmt ? { mgmt } : {}),
		topology: { nodes, links },
	};
}
