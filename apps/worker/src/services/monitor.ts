import evaluator from "@vlab/evaluator";
import baseLogger from "@worker/lib/logger";
import type { RpcServer } from "../handlers/server";
import { clabMonitor } from "../lib/clab-monitor";
import { LABELS } from "../lib/constants";
import docker from "../lib/docker";

const logger = baseLogger.child({ service: "monitor" });

const labSessionIdByNodeId = new Map<string, string>();

export function bindMonitorEvents(server: RpcServer) {
	const { emitter, init } = clabMonitor;

	emitter.on("node-create", async (node) => {
		try {
			const info = await docker.getContainer(node.containerId).inspect();
			const labSessionId = info.Config.Labels?.[LABELS.SESSION_ID];
			if (labSessionId) labSessionIdByNodeId.set(node.id, labSessionId);
		} catch (error) {
			logger.error(
				{ err: error, nodeId: node.id },
				"Failed to resolve lab session id for node",
			);
		}
	});

	emitter.on("node-remove", (id) => {
		labSessionIdByNodeId.delete(id);
	});

	emitter.on("health-update", (node) => {
		const labSessionId = labSessionIdByNodeId.get(node.id);

		server.emit("monitor:node-health", {
			data: { node: { id: node.id, health: node.health, labSessionId } },
		});
	});

	emitter.on("interface-update", (node) => {
		evaluator.emitSource(
			node.id,
			"node-interface.interfaces-ip",
			node.interfaces,
		);

		const labSessionId = labSessionIdByNodeId.get(node.id);
		if (!labSessionId) return;

		server.emit("monitor:interface-update", {
			data: {
				node: { id: node.id, interfaces: node.interfaces, labSessionId },
			},
		});
	});

	init();
}
