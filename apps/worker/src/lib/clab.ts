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
	],
};

import { LABELS } from "./constants";

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
			"auto-remove": true,
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

	const deployedNodes: { id: string; ip: string; containerId: string }[] = [];
	for (const node of inspected) {
		const id = idByKebabName[node.name];
		if (!id) {
			logger.warn(
				{ sessionId, containerName: node.name },
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

		deployedNodes.push({ id, ip, containerId: node.containerId });
	}

	return deployedNodes;
}

export const destroyingSessions = new Set<string>();

export async function destroyLab(sessionId: string) {
	destroyingSessions.add(sessionId);
	try {
		await stopLabEvaluation(sessionId, { immediate: true });
		return await clab.destroy(sessionId);
	} finally {
		destroyingSessions.delete(sessionId);
	}
}

export async function checkPrerequisites() {
	return clab.checkPrerequisites();
}

export default { deployLab, destroyLab, checkPrerequisites };
