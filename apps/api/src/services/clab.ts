import env from "@api/env";
import type { LabConfig } from "@api/types/clab";
import { toKebabCase } from "@api/utils/string";
import { createContainerlabClient } from "@vlab/clab";
import type { Node } from "@vlab/clab/types";
import { LABELS } from "@vlab/clab-monitor/constants";

const { client, wrapper } = createContainerlabClient({
	uri: env.CLAB_URL,
	username: env.CLAB_USERNAME,
	password: env.CLAB_PASSWORD,
});

export async function deployLab(sessionId: string, config: LabConfig) {
	const defaultLabels: Record<string, string> = {
		[LABELS.SESSION_ID]: sessionId,
		[LABELS.OWNER_ID]: config.ownerId,
	};

	if (config.labId) {
		defaultLabels[LABELS.LAB_ID] = config.labId;
	}

	const nodeNames: Record<string, string> = {};
	const nodes: Record<string, Node> = {};

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
		};
	}

	const links = config.links?.map((link) => ({
		endpoints: [
			`${nodeNames[link.sourceId]}:${link.sourceInterface}`,
			`${nodeNames[link.targetId]}:${link.targetInterface}`,
		],
	}));

	return wrapper(() =>
		client.POST("/api/v1/labs", {
			body: {
				topologyContent: {
					name: sessionId,
					topology: {
						defaults: { labels: defaultLabels },
						nodes,
						links,
					},
				},
			},
		}),
	);
}

export async function destroyLab(sessionId: string) {
	return wrapper(() =>
		client.DELETE("/api/v1/labs/{labName}", {
			params: {
				path: { labName: sessionId },
				query: { cleanup: true, keepMgmtNet: true },
			},
		}),
	);
}

export default { deployLab, destroyLab };
