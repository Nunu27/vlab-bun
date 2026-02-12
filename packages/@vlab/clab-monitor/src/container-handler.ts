import type { DeviceKind, NodeHealth } from "@vlab/shared/enums";
import { LABELS } from "./constants";
import networkMonitor from "./network-monitor";
import type { ContainerEvent, Context, NodeData, NodeInfo } from "./types";
import { extractManagementIp } from "./utils";

async function onContainerCreate(ctx: Context, event: ContainerEvent) {
	const { logger, docker, sessionIds, eventEmitter } = ctx;
	logger.debug("Container created: %s", event.Actor.ID);
	const { ID, Attributes } = event.Actor;

	const {
		[LABELS.SESSION_ID]: labSessionId,
		[LABELS.LAB_ID]: labId,
		[LABELS.OWNER_ID]: ownerId,
	} = Attributes;

	// Non lab container
	if (!labSessionId || !ownerId) return;

	if (!sessionIds.has(labSessionId) && labId) {
		eventEmitter.emit("session-create", {
			id: labSessionId,
			labId,
			ownerId,
		});
		sessionIds.add(labSessionId);
	}

	const {
		[LABELS.SESSION_NODE_ID]: id,
		[LABELS.CLAB_NODE_NAME]: name,
		[LABELS.LAB_NODE_ID]: labNodeId,
		[LABELS.DEVICE_TEMPLATE_ID]: deviceTemplateId,
		[LABELS.CLAB_NODE_KIND]: deviceKind,
	} = Attributes;

	// Non lab container
	if (!id || !name || !deviceKind) return;

	const container = docker.getContainer(ID);
	const info = await container.inspect();
	const health = (info.State.Health?.Status as NodeHealth) || null;
	const ip = extractManagementIp(info.NetworkSettings);

	if (!ip) return;

	const nodeInfo: NodeInfo = {
		id,
		health,
		labSessionId,
		deviceKind: deviceKind as DeviceKind,
		ip,
		isTemp: !labNodeId,
	};

	const nodeData = {
		id,
		name,
		labNodeId,
		deviceTemplateId,
		containerId: ID,
		health,
		labSessionId,
		ip,
		interfaces: await networkMonitor.extractInterfaces(
			ctx,
			container,
			nodeInfo,
		),
	} satisfies NodeData;

	eventEmitter.emit("node-create", nodeData);
	networkMonitor.start(ctx, container, nodeInfo);
}

async function onContainerRemove(ctx: Context, event: ContainerEvent) {
	const { logger, sessionIds, eventEmitter } = ctx;
	logger.debug("Container removed: %s", event.Actor.ID);

	const {
		[LABELS.SESSION_ID]: labSessionId,
		[LABELS.SESSION_NODE_ID]: id,
		[LABELS.CLAB_NODE_KIND]: deviceKind,
		[LABELS.LAB_NODE_ID]: labNodeId,
	} = event.Actor.Attributes;

	if (!id || !labSessionId || !deviceKind) return;

	networkMonitor.stop(ctx, { id, labSessionId, deviceKind } as NodeInfo);
	eventEmitter.emit("node-remove", id, !labNodeId);

	if (!sessionIds.has(labSessionId)) return;

	eventEmitter.emit("session-remove", labSessionId);
	sessionIds.delete(labSessionId);
}

async function onContainerHealthStatus(
	{ logger, eventEmitter }: Context,
	event: ContainerEvent,
) {
	const { Action, Actor } = event;
	const {
		[LABELS.SESSION_NODE_ID]: id,
		[LABELS.SESSION_ID]: labSessionId,
		[LABELS.LAB_NODE_ID]: labNodeId,
	} = Actor.Attributes;

	if (!id || !labSessionId) return;

	const health = Action.split(": ")[1] as NodeHealth;

	logger.debug("Container health status: %s, %s", Actor.ID, health);
	eventEmitter.emit(
		"node-health",
		{
			id,
			labSessionId,
			health,
		},
		!labNodeId,
	);
}

export default {
	create: onContainerCreate,
	destroy: onContainerRemove,
	health_status: onContainerHealthStatus,
};
