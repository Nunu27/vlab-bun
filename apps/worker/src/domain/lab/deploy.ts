import type { Static } from "@sinclair/typebox";
import { formatHealth } from "@vlab/clab-monitor";
import type { LabConfigSchema } from "@vlab/grpc";
import clab from "@worker/lib/clab";
import baseLogger from "@worker/lib/logger";
import { buildTopology } from "./topology";

const logger = baseLogger.child({ service: "clab" });

export async function deployLab(
	sessionId: string,
	config: Static<typeof LabConfigSchema>,
) {
	const { topology, idByKebabName } = buildTopology(sessionId, config);

	const inspected = await clab.deploy(sessionId, topology);

	const deployedNodes: {
		id: string;
		nodeId: string;
		ip: string;
		health: ReturnType<typeof formatHealth>;
	}[] = [];

	for (const node of inspected) {
		const nodeId = idByKebabName[node.name];
		if (!nodeId) {
			logger.warn(
				{ sessionId, nodeName: node.name },
				"Deployed container has no matching session node id, skipping",
			);
			continue;
		}

		// containerlab's inspect reports management IPs as CIDR (e.g. "1.2.3.4/24");
		const ip = node.ipv4Address?.split("/")[0];
		if (!ip) {
			logger.warn(
				{ sessionId, nodeName: node.name, nodeId },
				"Deployed container has no management IP, skipping",
			);
			continue;
		}

		const health = formatHealth(node.status);

		deployedNodes.push({ id: node.containerId, nodeId, ip, health });
	}

	return deployedNodes;
}
