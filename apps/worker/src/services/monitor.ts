import { clabMonitor } from "../lib/clab-monitor";
import { server } from "./worker";

export function bindMonitorEvents() {
	const { emitter, init } = clabMonitor;

	emitter.on("stale-session", (sessionId: string) => {
		server.emit("monitor:stale-session", undefined, { sessionId });
	});

	emitter.on("snapshot", (snapshotObj: any) => {
		server.emit("monitor:snapshot", undefined, snapshotObj);
	});

	emitter.on("session-create", (sessionObj: any) => {
		server.emit("monitor:session-create", undefined, sessionObj);
	});

	emitter.on("session-remove", (sessionId: string) => {
		server.emit("monitor:session-remove", undefined, { sessionId });
	});

	emitter.on("node-create", (nodeObj: any) => {
		server.emit("monitor:node-create", undefined, nodeObj);
	});

	emitter.on("node-health", (node: any, isTemp: boolean) => {
		server.emit("monitor:node-health", undefined, { node, isTemp });
	});

	emitter.on("interface-update", (node: any, isTemp: boolean) => {
		server.emit("monitor:interface-update", undefined, { node, isTemp });
	});

	init();
}
