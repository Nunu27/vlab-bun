import { AsyncQueue, type MonitorProto } from "@vlab/grpc";
import { clabMonitor } from "../lib/clab-monitor";
import { metadata, monitorClient } from "./client";

export const eventQueue = new AsyncQueue<MonitorProto.MonitorEvent>();

export async function streamEvents() {
	try {
		await monitorClient.streamMonitorEvents(eventQueue, { metadata });
	} catch (err) {
		console.error("StreamMonitorEvents ended with error", err);
		setTimeout(streamEvents, 5000);
	}
}

export function bindMonitorEvents() {
	const { emitter, init } = clabMonitor;

	const forwardEvent = (type: string) => {
		// @ts-expect-error: TypeScript cannot infer dynamic event listener types for generic EventEmitter string names
		emitter.on(type, (...args: unknown[]) => {
			eventQueue.push({ type, payload: JSON.stringify(args) });
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
