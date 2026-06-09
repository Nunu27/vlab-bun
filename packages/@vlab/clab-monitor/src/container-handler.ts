import networkMonitor from "./network-monitor";
import type {
	ContainerEvent,
	Context,
	FullMappingConstraint,
	NodeData,
	NodeInfo,
	ResolvedMapping,
} from "./types";
import { buildResolvedData, extractManagementIp } from "./utils";

async function onContainerCreate<TFullMapping extends FullMappingConstraint>(
	ctx: Context<TFullMapping>,
	event: ContainerEvent,
) {
	const { logger, docker, sessionIds, eventEmitter } = ctx;
	logger.debug("Container created: %s", event.Actor.ID);
	const { ID, Attributes } = event.Actor;

	const resolved = buildResolvedData(ctx.mapping, Attributes);
	if (!resolved) return;

	if (ctx.filter && !ctx.filter(resolved)) return;

	const isTemp = ctx.isTemp ? ctx.isTemp(resolved) : false;

	if (!isTemp && !sessionIds.has(resolved.sessionId)) {
		const { sessionId, nodeId, name, deviceKind, ...userResolved } = resolved;
		eventEmitter.emit("session-create", {
			...(userResolved as unknown as ResolvedMapping<TFullMapping>),
			id: resolved.sessionId,
		});
		sessionIds.add(resolved.sessionId);
	}

	const container = docker.getContainer(ID);
	const info = await container.inspect();
	const health = info.State.Health?.Status || null;
	const ip = extractManagementIp(info.NetworkSettings);

	if (!ip) return;

	const nodeInfo: NodeInfo = {
		id: resolved.nodeId,
		health,
		labSessionId: resolved.sessionId,
		deviceKind: resolved.deviceKind,
		ip,
		isTemp,
	};

	const { sessionId, nodeId, name, deviceKind, ...userResolved } = resolved;
	const nodeData: NodeData<TFullMapping> = {
		...(userResolved as unknown as ResolvedMapping<TFullMapping>),
		id: resolved.nodeId,
		name: resolved.name,
		containerId: ID,
		health,
		labSessionId: resolved.sessionId,
		ip,
		interfaces: await networkMonitor.extractInterfaces(
			ctx,
			container,
			nodeInfo,
		),
	};

	eventEmitter.emit("node-create", nodeData);
	networkMonitor.start(ctx, container, nodeInfo);
}

async function onContainerRemove<TFullMapping extends FullMappingConstraint>(
	ctx: Context<TFullMapping>,
	event: ContainerEvent,
) {
	const { logger, sessionIds, eventEmitter } = ctx;
	logger.debug("Container removed: %s", event.Actor.ID);

	const resolved = buildResolvedData(ctx.mapping, event.Actor.Attributes);
	if (!resolved) return;

	const isTemp = ctx.isTemp ? ctx.isTemp(resolved) : false;

	if (!isTemp && sessionIds.has(resolved.sessionId)) {
		eventEmitter.emit("session-remove", resolved.sessionId);
		sessionIds.delete(resolved.sessionId);
	}

	networkMonitor.stop(ctx, {
		id: resolved.nodeId,
		labSessionId: resolved.sessionId,
		deviceKind: resolved.deviceKind,
		health: null,
		ip: "",
		isTemp,
	});
	eventEmitter.emit("node-remove", resolved.nodeId, isTemp);
}

async function onContainerHealthStatus<
	TFullMapping extends FullMappingConstraint,
>(ctx: Context<TFullMapping>, event: ContainerEvent) {
	const { logger, eventEmitter } = ctx;
	const { Action, Actor } = event;

	const resolved = buildResolvedData(ctx.mapping, Actor.Attributes);
	if (!resolved) return;

	const health = Action.split(": ")[1] ?? null;
	const isTemp = ctx.isTemp ? ctx.isTemp(resolved) : false;

	logger.debug("Container health status: %s, %s", Actor.ID, health);
	eventEmitter.emit(
		"node-health",
		{ id: resolved.nodeId, labSessionId: resolved.sessionId, health },
		isTemp,
	);
}

export default {
	create: onContainerCreate,
	die: onContainerRemove,
	health_status: onContainerHealthStatus,
};
