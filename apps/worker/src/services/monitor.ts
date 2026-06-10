import { destroyLab } from "../lib/clab";
import { clabMonitor } from "../lib/clab-monitor";
import { server } from "./worker";

export function bindMonitorEvents() {
	const { emitter, init } = clabMonitor;

	emitter.on("stale-session", (sessionId) => {
		destroyLab(sessionId).catch(console.error);
	});

	emitter.on("snapshot", (snapshot) => {
		server.emit("monitor:snapshot", undefined, snapshot);
	});

	emitter.on("session-create", (session) => {
		server.emit("monitor:session-create", undefined, session);
	});

	emitter.on("session-remove", (sessionId) => {
		server.emit("monitor:session-remove", undefined, { sessionId });
	});

	emitter.on("node-create", (node) => {
		server.emit("monitor:node-create", undefined, node);
	});

	emitter.on("node-remove", (id, isTemp) => {
		server.emit("monitor:node-remove", undefined, { id, isTemp });
	});

	emitter.on("node-health", (node, isTemp) => {
		server.emit("monitor:node-health", undefined, { node, isTemp });
	});

	emitter.on("interface-update", (node, isTemp) => {
		server.emit("monitor:interface-update", undefined, { node, isTemp });
	});

	init();
}
