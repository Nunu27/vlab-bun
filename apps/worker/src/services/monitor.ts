import evaluator from "@vlab/evaluator";
import type { RpcServer } from "../handlers/server";
import { destroyLab } from "../lib/clab";
import { clabMonitor } from "../lib/clab-monitor";

export const monitorState = {
	activeNodes: 0,
};

export function bindMonitorEvents(server: RpcServer) {
	const { emitter, init } = clabMonitor;

	emitter.on("stale-session", (sessionId) => {
		destroyLab(sessionId).catch(console.error);
	});

	emitter.on("snapshot", (snapshot) => {
		monitorState.activeNodes = snapshot.nodes.length;
		server.emit("monitor:snapshot", { data: snapshot });
	});

	emitter.on("session-create", (session, isTemp) => {
		server.emit("monitor:session-create", { data: { ...session, isTemp } });
	});

	emitter.on("session-remove", (sessionId, isTemp) => {
		server.emit("monitor:session-remove", { data: { sessionId, isTemp } });
	});

	emitter.on("node-create", (node) => {
		monitorState.activeNodes++;
		server.emit("monitor:node-create", { data: node });
	});

	emitter.on("node-remove", (id, isTemp) => {
		monitorState.activeNodes = Math.max(0, monitorState.activeNodes - 1);
		server.emit("monitor:node-remove", { data: { id, isTemp } });
	});

	emitter.on("node-health", (node, isTemp) => {
		server.emit("monitor:node-health", { data: { node, isTemp } });
	});

	emitter.on("interface-update", (node, isTemp) => {
		server.emit("monitor:interface-update", { data: { node, isTemp } });
		evaluator.emitSource(
			node.id,
			"node-interface.interfaces-ip",
			node.interfaces,
		);
	});

	init();
}
