import type { NodeHealth } from "@vlab/shared/enums";
import { LABELS } from "./constants";
import networkMonitor from "./network-monitor";
import type {
	ContainerEvent,
	Context,
	NodeData,
	NodeInfo,
	SessionData
} from "./types";
import { extractPortMappings } from "./utils";

async function onContainerCreate(ctx: Context, event: ContainerEvent) {
	const { logger, docker, sessionIds, eventEmitter } = ctx;
	logger.debug("Container created: %s", event.Actor.ID);
	const { ID, Attributes } = event.Actor;

	const {
		[LABELS.SESSION_ID]: labSessionId,
		[LABELS.LAB_TYPE]: type,
		[LABELS.LAB_ID]: labId,
		[LABELS.OWNER_ID]: ownerId
	} = Attributes;

	if (!sessionIds.has(labSessionId!)) {
		eventEmitter.emit("session-create", {
			id: labSessionId,
			type,
			labId,
			ownerId
		} as SessionData);
		sessionIds.add(labSessionId!);
	}

	const {
		[LABELS.NODE_ID]: id,
		[LABELS.CLAB_NODE_NAME]: name,
		[LABELS.DEVICE_ID]: deviceId,
		[LABELS.CLAB_NODE_KIND]: deviceKind
	} = Attributes;

	const container = docker.getContainer(ID);
	const info = await container.inspect();
	const nodeInfo = { id, deviceKind } as NodeInfo;

	eventEmitter.emit("node-create", {
		id,
		name,
		deviceId,
		health: info.State.Health?.Status,
		labSessionId: labSessionId!,
		ports: extractPortMappings(info),
		interfaces: await networkMonitor.extractInterfaces(ctx, container, nodeInfo)
	} as NodeData);

	await networkMonitor.start(ctx, container, nodeInfo);
}

async function onContainerRemove(ctx: Context, event: ContainerEvent) {
	const { logger, sessionIds, eventEmitter } = ctx;
	logger.debug("Container removed: %s", event.Actor.ID);

	const {
		[LABELS.SESSION_ID]: sessionId,
		[LABELS.NODE_ID]: id,
		[LABELS.CLAB_NODE_KIND]: deviceKind
	} = event.Actor.Attributes;
	networkMonitor.stop(ctx, { id, deviceKind } as NodeInfo);

	eventEmitter.emit("node-remove", id!);

	if (!sessionIds.has(sessionId!)) return;

	eventEmitter.emit("session-remove", sessionId!);
	sessionIds.delete(sessionId!);
}

async function onContainerHealthStatus(
	{ logger, eventEmitter }: Context,
	event: ContainerEvent
) {
	const { Action, Actor } = event;

	const { [LABELS.NODE_ID]: id, [LABELS.SESSION_ID]: labSessionId } =
		Actor.Attributes;
	const health = Action.split(": ")[1] as NodeHealth;

	logger.debug("Container health status: %s, %s", Actor.ID, health);
	eventEmitter.emit("node-health", {
		id: id!,
		labSessionId: labSessionId!,
		health
	});
}

export default {
	create: onContainerCreate,
	destroy: onContainerRemove,
	health_status: onContainerHealthStatus
};
