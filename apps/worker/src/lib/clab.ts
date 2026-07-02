import { writeFileSync } from "node:fs";
import type { Static } from "@sinclair/typebox";
import type {
	ContainerlabLinkDefinition,
	ContainerlabNodeDefinition,
	ContainerlabTopologyDefinition,
} from "@vlab/clab";
import Containerlab from "@vlab/clab";
import type { LabConfigSchema } from "@vlab/grpc";
import { toKebabCase } from "@vlab/shared/utils";
import baseLogger from "@worker/lib/logger";
import env from "../env";
import { LABELS } from "./constants";
import { stopLabEvaluation } from "./evaluator";

const logger = baseLogger.child({ service: "clab" });

const clab = new Containerlab({
	cliPath: env.CLAB_CLI_PATH,
	topologiesPath: env.CLAB_TOPOLOGIES_PATH,
});

const startupExecs: Partial<Record<string, string[]>> = {
	linux: [
		"ip route del default",
		`ip route add ${env.GUACD_IP} dev eth0`,
		`sh -c 'echo "nameserver 8.8.8.8" > /etc/resolv.conf'`,
		"sh -c 'rm -f /sbin/shutdown /sbin/poweroff /sbin/reboot /sbin/halt /usr/sbin/shutdown /usr/sbin/poweroff /usr/sbin/reboot /usr/sbin/halt || true'",
		'sh -c \'printf "#!/bin/sh\\necho \\"Shutdown is disabled in this lab.\\" >&2\\nexit 1\\n" > /sbin/shutdown\'',
		"sh -c 'chmod +x /sbin/shutdown'",
		"sh -c 'ln -s /sbin/shutdown /sbin/poweroff || true'",
		"sh -c 'ln -s /sbin/shutdown /sbin/reboot || true'",
		"sh -c 'ln -s /sbin/shutdown /sbin/halt || true'",
	],
};

export async function deployLab(
	sessionId: string,
	config: Static<typeof LabConfigSchema>,
) {
	const defaultLabels: Record<string, string> = {
		[LABELS.SESSION_ID]: sessionId,
		[LABELS.OWNER_ID]: config.ownerId,
	};

	if (config.labId) {
		defaultLabels[LABELS.LAB_ID] = config.labId;
	}

	if (config.dueDate) {
		defaultLabels[LABELS.LAB_DUE] = config.dueDate.toString();
	}

	const nodeNames: Record<string, string> = {};
	const idByKebabName: Record<string, string> = {};
	const nodes: Record<string, ContainerlabNodeDefinition> = {};

	for (const {
		id,
		name,
		resources,
		deviceId,
		labNodeId,
		credentials,
		env: nodeEnv,
		...rest
	} of config.nodes) {
		const kebabName = toKebabCase(name);
		idByKebabName[kebabName] = id;
		const labels: Record<string, string> = {
			[LABELS.SESSION_NODE_ID]: id,
		};

		if (deviceId && labNodeId) {
			labels[LABELS.DEVICE_TEMPLATE_ID] = deviceId;
			labels[LABELS.LAB_NODE_ID] = labNodeId;

			nodeNames[labNodeId] = kebabName;
		}

		const env = { ...nodeEnv };
		if (rest.kind === "linux" && credentials) {
			if (credentials.username) {
				env.USERNAME = credentials.username;
			}
			if (credentials.password) {
				env.PASSWORD = credentials.password;
			}
		}

		nodes[kebabName] = {
			...rest,
			env,
			cpu: resources.cpu ?? undefined,
			memory: resources.memory ?? undefined,
			labels,
			credentials,
			stages: {
				configure: {
					exec: startupExecs[rest.kind]?.map((command) => ({
						command,
						target: "container",
						phase: "on-exit",
					})),
				},
			},
		};

		if (rest.kind === "mikrotik_ros") {
			const configPath = "/tmp/mikrotik-noreboot.rsc";
			writeFileSync(configPath, "/user group set [find] policy=!reboot\n");
			nodes[kebabName]["startup-config"] = configPath;
		}
	}

	const links: ContainerlabLinkDefinition[] =
		config.links?.map((link) => ({
			endpoints: [
				`${nodeNames[link.sourceId]}:${link.sourceInterface}`,
				`${nodeNames[link.targetId]}:${link.targetInterface}`,
			],
		})) ?? [];

	const topologyContent: ContainerlabTopologyDefinition = {
		name: sessionId,
		mgmt: {
			network: env.CLAB_MGMT_NETWORK,
		},
		topology: {
			defaults: { labels: defaultLabels },
			nodes,
			links,
		},
	};

	const inspected = await clab.deploy(sessionId, topologyContent);

	const deployedNodes: {
		id: string;
		ip: string;
		containerId: string;
		health: string | null;
	}[] = [];
	for (const node of inspected) {
		let nodeName = node.name;
		const expectedPrefix = `clab-${sessionId}-`;
		if (nodeName.startsWith(expectedPrefix)) {
			nodeName = nodeName.substring(expectedPrefix.length);
		}

		const id = idByKebabName[nodeName];
		if (!id) {
			logger.warn(
				{ sessionId, containerName: node.name, parsedNodeName: nodeName },
				"Deployed container has no matching session node id, skipping",
			);
			continue;
		}

		// containerlab's inspect reports management IPs as CIDR (e.g. "1.2.3.4/24");
		// every other consumer (guacamole tokens, docker-event-driven sync) expects a bare IP.
		const ip = node.ipv4Address?.split("/")[0];
		if (!ip) {
			logger.warn(
				{ sessionId, containerName: node.name, id },
				"Deployed container has no management IP, skipping",
			);
			continue;
		}

		const health = node.status?.startsWith("Up") ? null : (node.status ?? null);

		deployedNodes.push({
			id,
			ip,
			containerId: node.containerId,
			health,
		});
	}

	return deployedNodes;
}

// Lets a `clab:destroyLab` RPC and reconcileSessions racing on the same
// session share one in-flight destroy instead of running two.
export const destroyingSessions = new Map<string, Promise<unknown>>();

export async function destroyLab(sessionId: string) {
	const inFlight = destroyingSessions.get(sessionId);
	if (inFlight) return inFlight;

	const promise = (async () => {
		try {
			await stopLabEvaluation(sessionId, { immediate: true });
			return await clab.destroy(sessionId);
		} finally {
			destroyingSessions.delete(sessionId);
		}
	})();

	destroyingSessions.set(sessionId, promise);
	return promise;
}

export async function checkPrerequisites() {
	return clab.checkPrerequisites();
}

// Called once on worker connect: the manager sends the session ids it still
// considers active, and anything deployed locally but absent from that list
// is a leftover from a crash/restart/missed destroy and gets torn down.
export async function reconcileSessions(activeSessionIds: string[]) {
	const active = new Set(activeSessionIds);
	const deployedIds = await clab.listDeployedIds();

	const destroyed: string[] = [];
	for (const id of deployedIds) {
		if (active.has(id)) continue;

		try {
			await destroyLab(id);
			destroyed.push(id);
		} catch (error) {
			logger.error(
				{ err: error, sessionId: id },
				"Failed to destroy stale lab session",
			);
		}
	}

	return destroyed;
}

export default {
	deployLab,
	destroyLab,
	checkPrerequisites,
	reconcileSessions,
};
