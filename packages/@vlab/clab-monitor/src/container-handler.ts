import type { NodeHealth } from "@vlab/shared/enums";
import { LABELS } from "./constants";
import networkMonitor from "./network-monitor";
import type { ContainerEvent, Context, NodeInfo, SessionData } from "./types";
import { extractPortMappings } from "./utils";

async function onContainerCreate(ctx: Context, event: ContainerEvent) {
	const { logger, docker, sessionIds, eventEmitter } = ctx;
	logger.debug("Container created: %s", event.Actor.ID);
	const { ID, Attributes } = event.Actor;

	const {
		[LABELS.SESSION_ID]: labSessionId,
		[LABELS.LAB_TYPE]: type,
		[LABELS.LAB_ID]: labId,
		[LABELS.OWNER_ID]: ownerId,
	} = Attributes;

	if (!labSessionId || !type || !ownerId) return;

	if (!sessionIds.has(labSessionId)) {
		eventEmitter.emit("session-create", {
			id: labSessionId,
			type,
			labId,
			ownerId,
		} as SessionData);
		sessionIds.add(labSessionId);
	}

	const {
		[LABELS.NODE_ID]: id,
		[LABELS.CLAB_NODE_NAME]: name,
		[LABELS.DEVICE_ID]: deviceId,
		[LABELS.CLAB_NODE_KIND]: deviceKind,
	} = Attributes;

	if (!id || !name || !deviceKind) return;

	const container = docker.getContainer(ID);
	const info = await container.inspect();
	const health = (info.State.Health?.Status as NodeHealth) || null;
	const ports = extractPortMappings(info);
	const nodeInfo = {
		id,
		health,
		labSessionId,
		deviceKind,
		ports,
	} as NodeInfo;

	eventEmitter.emit("node-create", {
		id,
		name,
		deviceId,
		health,
		labSessionId,
		ports,
		interfaces: await networkMonitor.extractInterfaces(
			ctx,
			container,
			nodeInfo,
		),
	});

	networkMonitor.start(ctx, container, nodeInfo);
}

async function onContainerRemove(ctx: Context, event: ContainerEvent) {
	const { logger, sessionIds, eventEmitter } = ctx;
	logger.debug("Container removed: %s", event.Actor.ID);

	const {
		[LABELS.SESSION_ID]: labSessionId,
		[LABELS.NODE_ID]: id,
		[LABELS.CLAB_NODE_KIND]: deviceKind,
	} = event.Actor.Attributes;

	if (!id || !labSessionId || !deviceKind) return;

	networkMonitor.stop(ctx, { id, labSessionId, deviceKind } as NodeInfo);

	eventEmitter.emit("node-remove", id);

	if (!sessionIds.has(labSessionId)) return;

	eventEmitter.emit("session-remove", labSessionId);
	sessionIds.delete(labSessionId);
}

async function onContainerHealthStatus(
	{ logger, eventEmitter }: Context,
	event: ContainerEvent,
) {
	const { Action, Actor } = event;
	const { [LABELS.NODE_ID]: id, [LABELS.SESSION_ID]: labSessionId } =
		Actor.Attributes;

	if (!id || !labSessionId) return;

	const health = Action.split(": ")[1] as NodeHealth;

	logger.debug("Container health status: %s, %s", Actor.ID, health);
	eventEmitter.emit("node-health", {
		id,
		labSessionId,
		health,
	});
}

export default {
	create: onContainerCreate,
	destroy: onContainerRemove,
	health_status: onContainerHealthStatus,
};
