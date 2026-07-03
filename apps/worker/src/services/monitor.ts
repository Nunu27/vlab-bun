import evaluator from "@vlab/evaluator";
import baseLogger from "@worker/lib/logger";
import type { RpcServer } from "../handlers/server";
import { attemptNodeRecovery, stripLabPrefix } from "../lib/clab";
import { clabMonitor } from "../lib/clab-monitor";
import { LABELS, MAX_HEAL_JITTER_MS } from "../lib/constants";
import docker from "../lib/docker";

const logger = baseLogger.child({ service: "monitor" });

const labSessionIdByNodeId = new Map<string, string>();
const nodeNameByNodeId = new Map<string, string>();
const healedNodes = new Set<string>();
const pendingHeal = new Map<string, ReturnType<typeof setTimeout>>();

function clearPendingHeal(id: string) {
	const timer = pendingHeal.get(id);
	if (timer) {
		clearTimeout(timer);
		pendingHeal.delete(id);
	}
}

export function bindMonitorEvents(server: RpcServer) {
	const { emitter, init } = clabMonitor;

	emitter.on("node-create", async (node) => {
		try {
			const info = await docker.getContainer(node.containerId).inspect();
			const labSessionId = info.Config.Labels?.[LABELS.SESSION_ID];
			if (labSessionId) {
				labSessionIdByNodeId.set(node.id, labSessionId);
				const containerName = info.Name.replace(/^\//, "");
				nodeNameByNodeId.set(
					node.id,
					stripLabPrefix(labSessionId, containerName),
				);
			}
		} catch (error) {
			logger.error(
				{ err: error, nodeId: node.id },
				"Failed to resolve lab session id for node",
			);
		}
	});

	emitter.on("node-remove", (id) => {
		labSessionIdByNodeId.delete(id);
		nodeNameByNodeId.delete(id);
		healedNodes.delete(id);
		clearPendingHeal(id);
	});

	emitter.on("health-update", (node) => {
		const labSessionId = labSessionIdByNodeId.get(node.id);

		server.emit("monitor:node-health", {
			data: { node: { id: node.id, health: node.health, labSessionId } },
		});

		if (node.health === "healthy") {
			clearPendingHeal(node.id);
			return;
		}

		if (
			node.health !== "unhealthy" ||
			healedNodes.has(node.id) ||
			pendingHeal.has(node.id)
		) {
			return;
		}

		const nodeName = nodeNameByNodeId.get(node.id);
		if (!labSessionId || !nodeName) return;

		const timer = setTimeout(
			async () => {
				pendingHeal.delete(node.id);
				healedNodes.add(node.id);

				const result = await attemptNodeRecovery(labSessionId, nodeName);
				if (!result) return;

				server.emit("monitor:node-redeployed", {
					data: {
						node: {
							id: node.id,
							ip: result.ip,
							containerId: result.containerId,
							labSessionId,
						},
					},
				});
			},
			Math.floor(Math.random() * MAX_HEAL_JITTER_MS),
		);

		pendingHeal.set(node.id, timer);
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
