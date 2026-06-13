import evaluator from "@vlab/evaluator";
import type { RpcServer } from "../handlers/server";
import { destroyLab } from "../lib/clab";
import { clabMonitor } from "../lib/clab-monitor";

export const monitorState = {
	activeLabs: 0,
	activeNodes: 0,
};

export function bindMonitorEvents(server: RpcServer) {
	const { emitter, init } = clabMonitor;

	emitter.on("stale-session", (sessionId) => {
		destroyLab(sessionId).catch(console.error);
	});

	emitter.on("snapshot", (snapshot) => {
		monitorState.activeLabs = snapshot.sessions.length;
		monitorState.activeNodes = snapshot.nodes.length;
		server.emit("monitor:snapshot", undefined, snapshot);
	});

	emitter.on("session-create", (session) => {
		monitorState.activeLabs++;
		server.emit("monitor:session-create", undefined, session);
	});

	emitter.on("session-remove", (sessionId) => {
		monitorState.activeLabs = Math.max(0, monitorState.activeLabs - 1);
		server.emit("monitor:session-remove", undefined, { sessionId });
	});

	emitter.on("node-create", (node) => {
		monitorState.activeNodes++;
		if (node.health === "none") node.health = null;
		server.emit("monitor:node-create", undefined, node);
	});

	emitter.on("node-remove", (id, isTemp) => {
		monitorState.activeNodes = Math.max(0, monitorState.activeNodes - 1);
		server.emit("monitor:node-remove", undefined, { id, isTemp });
	});

	emitter.on("node-health", (node, isTemp) => {
		if (node.health === "none") node.health = null;
		server.emit("monitor:node-health", undefined, { node, isTemp });
	});

	emitter.on("interface-update", (node, isTemp) => {
		server.emit("monitor:interface-update", undefined, { node, isTemp });
		evaluator.emitSource(
			node.id,
			"node-interface.interfaces-ip",
			node.interfaces,
		);
	});

	init();
}
