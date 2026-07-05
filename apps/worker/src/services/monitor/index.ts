import evaluator from "@vlab/evaluator";
import baseLogger from "@worker/lib/logger";
import { monitor as clabMonitor } from "@worker/lib/monitor";
import type { RpcServer } from "@worker/services/grpc/transport";
import * as heal from "@worker/services/monitor/heal";

const logger = baseLogger.child({ service: "monitor" });

export function startMonitorService(server: RpcServer) {
	clabMonitor.emitter.on("health-update", async (node, health) => {
		server.emit("monitor:node-health", {
			data: {
				id: node.id,
				health,
				lab: node.lab,
			},
		});

		if (health === "unhealthy") {
			heal.trigger(node);
		} else if (health === "healthy" || health === null) {
			heal.reset(node.id);
		}
	});

	clabMonitor.emitter.on("interface-update", async (node, interfaces) => {
		server.emit("monitor:interface-update", {
			data: {
				id: node.id,
				interfaces,
				lab: node.lab,
			},
		});

		evaluator.emitSource(node.id, "node-interface.interfaces-ip", interfaces);
	});

	clabMonitor.monitor.start();
	logger.info("Docker event monitor started");
}

export function stopMonitorService() {
	clabMonitor.monitor.stop();
	heal.clearAll();
}
