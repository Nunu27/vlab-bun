import networkMonitor from "./network-monitor";
import type { ContainerEvent, Context, NodeData, NodeInfo } from "./types";
import { extractManagementIp, resolveNode } from "./utils";

async function onContainerCreate(ctx: Context, event: ContainerEvent) {
	const { logger, docker, eventEmitter } = ctx;
	logger.debug("Container created: %s", event.Actor.ID);
	const { ID, Attributes } = event.Actor;

	const resolved = resolveNode(ctx.nodeIdLabel, Attributes);
	if (!resolved) return;

	const container = docker.getContainer(ID);
	const info = await container.inspect();
	const health = info.State.Health?.Status || null;
	const ip = extractManagementIp(info.NetworkSettings);

	if (!ip) return;

	const nodeInfo: NodeInfo = {
		id: resolved.id,
		health,
		deviceKind: resolved.deviceKind,
		ip,
	};

	const nodeData: NodeData = {
		...nodeInfo,
		name: resolved.name,
		containerId: ID,
		interfaces: await networkMonitor.extractInterfaces(
			ctx,
			container,
			nodeInfo,
		),
	};

	eventEmitter.emit("node-create", nodeData);
	eventEmitter.emit("health-update", {
		id: nodeInfo.id,
		health: nodeData.health,
	});
	networkMonitor.start(ctx, container, nodeInfo);
}

async function onContainerRemove(
	ctx: Context,
	event: Extract<ContainerEvent, { Action: "destroy" }>,
) {
	const { logger, eventEmitter } = ctx;
	logger.debug("Container removed: %s", event.Actor.ID);

	const resolved = resolveNode(ctx.nodeIdLabel, event.Actor.Attributes);
	if (!resolved) return;

	networkMonitor.stop(ctx, {
		id: resolved.id,
		deviceKind: resolved.deviceKind,
		health: null,
		ip: "",
	});

	eventEmitter.emit("node-remove", resolved.id);
}

async function onContainerHealthStatus(ctx: Context, event: ContainerEvent) {
	const { logger, docker, eventEmitter } = ctx;
	const { Action, Actor } = event;

	const resolved = resolveNode(ctx.nodeIdLabel, Actor.Attributes);
	if (!resolved) return;

	const health = Action.split(": ")[1] ?? null;

	logger.debug("Container health status: %s, %s", Actor.ID, health);
	eventEmitter.emit("health-update", { id: resolved.id, health });

	if (health !== "healthy") return;

	const container = docker.getContainer(Actor.ID);
	const info = await container.inspect();
	const ip = extractManagementIp(info.NetworkSettings);
	if (!ip) return;

	const nodeInfo: NodeInfo = {
		id: resolved.id,
		health,
		deviceKind: resolved.deviceKind,
		ip,
	};

	const interfaces = await networkMonitor.extractInterfaces(
		ctx,
		container,
		nodeInfo,
	);
	ctx.emitInterfaceUpdate({ id: resolved.id, interfaces });
	networkMonitor.start(ctx, container, nodeInfo);
}

export default {
	create: onContainerCreate,
	destroy: onContainerRemove,
	health_status: onContainerHealthStatus,
};
