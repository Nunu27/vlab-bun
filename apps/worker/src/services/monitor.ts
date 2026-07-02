import evaluator from "@vlab/evaluator";
import type { RpcServer } from "../handlers/server";
import { clabMonitor } from "../lib/clab-monitor";

export const monitorState = {
	activeNodes: 0,
};

export function bindMonitorEvents(_server: RpcServer) {
	const { emitter, init } = clabMonitor;

	// clab-monitor now only tracks node health + interfaces (no session/lab
	// label resolution, no stale-session detection) and emits exactly four
	// events: node-create (also covers hydration of already-running nodes),
	// node-remove, health-update, interface-update. The gRPC forwarding to
	// apps/manager (monitor:snapshot, monitor:session-create/remove,
	// monitor:node-create/health/interface-update/remove) and the
	// destroyLab-on-stale-session / destroyLab-on-unexpected-node-death
	// cleanup logic that used to live here need to be rebuilt manually,
	// resolving the extra labels (ownerId, labId, labDue, labSessionId,
	// labNodeId, deviceTemplateId) per node via docker inspect on
	// node.containerId. See packages/@vlab/grpc/src/commands.ts for the
	// expected monitor:* payload shapes.

	emitter.on("node-create", (_node) => {
		monitorState.activeNodes++;
		// TODO: resolve labels for _node.containerId + forward monitor:node-create
		// (also covers the former monitor:snapshot hydration path)
	});

	emitter.on("node-remove", (_id) => {
		monitorState.activeNodes = Math.max(0, monitorState.activeNodes - 1);
		// TODO: destroyLab-on-unexpected-death + forward monitor:node-remove
	});

	emitter.on("health-update", (_node) => {
		// TODO: forward monitor:node-health
	});

	emitter.on("interface-update", (node) => {
		evaluator.emitSource(
			node.id,
			"node-interface.interfaces-ip",
			node.interfaces,
		);
		// TODO: forward monitor:interface-update
	});

	init();
}
