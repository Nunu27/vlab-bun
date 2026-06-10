import type {
	ContainerlabNodeDefinition,
	ContainerlabTopologyDefinition,
} from "@vlab/clab";
import Containerlab from "@vlab/clab";
import type { DeviceKind } from "@vlab/shared/enums";
import { toKebabCase } from "@vlab/shared/utils";
import env from "../env";
import { stopLabEvaluation } from "./evaluator";

const clab = new Containerlab({
	cliPath: "containerlab",
	topologiesPath: "/var/lib/vlab/topologies",
});

const startupExecs: Partial<Record<DeviceKind, string[]>> = {
	linux: [
		"ip route del default",
		`ip route add ${env.GUACD_IP} dev eth0`,
		`sh -c 'echo "nameserver 8.8.8.8" > /etc/resolv.conf'`,
	],
};

export const LABELS = {
	LAB_NODE_ID: "vlab.lab.node.id",
	SESSION_ID: "vlab.lab.session.id",
	SESSION_NODE_ID: "vlab.lab.session.node.id",
	OWNER_ID: "vlab.lab.owner.id",
	LAB_ID: "vlab.lab.id",
	LAB_DUE: "vlab.lab.due",
	DEVICE_TEMPLATE_ID: "vlab.device.template.id",
} as const;

export async function deployLab(sessionId: string, config: any) {
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
	const nodes: Record<string, ContainerlabNodeDefinition> = {};

	for (const {
		id,
		name,
		resources,
		deviceId,
		labNodeId,
		...rest
	} of config.nodes) {
		const kebabName = toKebabCase(name);
		const labels: Record<string, string> = {
			[LABELS.SESSION_NODE_ID]: id,
		};

		if (deviceId && labNodeId) {
			labels[LABELS.DEVICE_TEMPLATE_ID] = deviceId;
			labels[LABELS.LAB_NODE_ID] = labNodeId;

			nodeNames[labNodeId] = kebabName;
		}

		nodes[kebabName] = {
			...rest,
			cpu: resources.cpu,
			memory: resources.memory,
			labels,
			"auto-remove": true,
			stages: {
				configure: {
					exec: startupExecs[rest.kind as DeviceKind]?.map((command) => ({
						command,
						target: "container",
						phase: "on-exit",
					})),
				},
			},
		} as ContainerlabNodeDefinition;
	}

	const links = config.links?.map((link: any) => ({
		endpoints: [
			`${nodeNames[link.sourceId]}:${link.sourceInterface}`,
			`${nodeNames[link.targetId]}:${link.targetInterface}`,
		],
	}));

	const topologyContent: ContainerlabTopologyDefinition = {
		name: sessionId,
		mgmt: {
			network: "clab-mgmt",
		},
		topology: {
			defaults: { labels: defaultLabels },
			nodes,
			links: links as any,
		},
	};

	return clab.deploy(sessionId, topologyContent);
}

export async function destroyLab(sessionId: string) {
	await stopLabEvaluation(sessionId, { immediate: true });
	return clab.destroy(sessionId);
}

export default { deployLab, destroyLab };
