import { LABELS } from "@backend/constants";
import db from "@backend/db";
import { labNodes, labSessions } from "@backend/db/schema/lab-session";
import { deleteCache } from "@backend/middlewares/caching";
import Throttler from "@backend/utils/throttler";
import type { LabType, NodeHealth, NodeStatus } from "@vlab/shared/enums";
import { eq } from "drizzle-orm";
import { clabDocker as docker } from "../docker";
import logger from "../logger";
import { startInterfaceMonitor, stopInterfaceMonitor } from "./network-monitor";
import {
	extractInterfaces,
	extractPortMappings,
	type ContainerEvent
} from "./utils";

export const sessionIds = new Set<string>();

const sessionThrottler = new Throttler(1000);

async function onContainerCreate(event: ContainerEvent) {
	logger.debug("Container created: %s", event.Actor.ID);

	const { ID, Attributes } = event.Actor;

	const {
		[LABELS.SESSION_ID]: sessionId,
		[LABELS.LAB_TYPE]: type,
		[LABELS.LAB_ID]: labId,
		[LABELS.OWNER_ID]: ownerId
	} = Attributes;

	if (!sessionIds.has(sessionId!)) {
		await sessionThrottler.run(sessionId!, async () => {
			logger.debug("Creating session: %s", sessionId);

			await db.insert(labSessions).values({
				id: sessionId!,
				type: type as LabType,
				labId,
				ownerId: ownerId!
			});
			await deleteCache("lab:pagination:*");

			sessionIds.add(sessionId!);
		});
	}

	const {
		[LABELS.NODE_ID]: id,
		[LABELS.CLAB_NODE_NAME]: name,
		[LABELS.DEVICE_ID]: deviceId
	} = Attributes;

	const container = docker.getContainer(ID);
	const info = await container.inspect();

	await db.insert(labNodes).values({
		id,
		name: name!,
		health: info.State.Health?.Status as NodeHealth,
		status: info.State.Status as NodeStatus,
		labSessionId: sessionId!,
		deviceId,
		ports: extractPortMappings(info),
		interfaces: await extractInterfaces(
			container,
			info.NetworkSettings.Networks
		)
	});

	await startInterfaceMonitor(container, id!, info.NetworkSettings.Networks);
}

async function onContainerRemove(event: ContainerEvent) {
	logger.debug("Container removed: %s", event.Actor.ID);

	const { [LABELS.SESSION_ID]: sessionId, [LABELS.NODE_ID]: nodeId } =
		event.Actor.Attributes;
	stopInterfaceMonitor(nodeId!);

	if (!sessionIds.has(sessionId!)) return;

	await sessionThrottler.run(sessionId!, async () => {
		logger.debug("Deleting session: %s", sessionId);

		await db.delete(labSessions).where(eq(labSessions.id, sessionId!));
		await deleteCache("lab:pagination:*", `lab:session:${sessionId}`);

		sessionIds.delete(sessionId!);
	});
}

async function onContainerHealthStatus(event: ContainerEvent) {
	const { Action, Actor } = event;

	const { [LABELS.NODE_ID]: nodeId, [LABELS.SESSION_ID]: sessionId } =
		Actor.Attributes;
	const health = Action.split(": ")[1] as NodeHealth;

	logger.debug("Container health status: %s, %s", Actor.ID, health);

	await db.update(labNodes).set({ health }).where(eq(labNodes.id, nodeId!));
	await deleteCache(`lab:session:${sessionId}`);
}

export default {
	create: onContainerCreate,
	destroy: onContainerRemove,
	health_status: onContainerHealthStatus
};
