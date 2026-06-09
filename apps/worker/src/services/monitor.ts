import { clabMonitor } from "../lib/clab-monitor";
import { server } from "./worker";

export function bindMonitorEvents() {
	const { emitter, init } = clabMonitor;

	const forwardEvent = (type: string) => {
		// @ts-expect-error: TypeScript cannot infer dynamic event listener types for generic EventEmitter string names
		emitter.on(type, (...args: unknown[]) => {
			server.emit("monitor:event", undefined, {
				type,
				payload: JSON.stringify(args),
			});
		});
	};

	[
		"stale-session",
		"snapshot",
		"session-create",
		"session-remove",
		"node-create",
		"node-remove",
		"node-health",
		"interface-update",
	].forEach(forwardEvent);

	init();
}
