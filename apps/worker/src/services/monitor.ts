import { clabMonitor } from "../lib/clab-monitor";
import { server } from "./worker";

export function bindMonitorEvents() {
	const { emitter, init } = clabMonitor;

	emitter.on("stale-session", (sessionId) => {
		server.emit("monitor:stale-session", undefined, { sessionId });
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

	emitter.on("node-health", (node, isTemp) => {
		server.emit("monitor:node-health", undefined, { node, isTemp });
	});

	emitter.on("interface-update", (node, isTemp) => {
		server.emit("monitor:interface-update", undefined, { node, isTemp });
	});

	init();
}
