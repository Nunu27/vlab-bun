import { notInArray, type InferInsertModel } from "drizzle-orm";
import { clabDocker as docker } from "../docker";
import logger from "../logger";
import containerHandler, { sessionIds } from "./container-handler";
import { extractInterfaces, isKey, type ContainerEvent } from "./utils";
import { labNodes, labSessions } from "@backend/db/schema/lab-session";
import type { ContainerInspectInfo } from "dockerode";
import { LABELS } from "@backend/constants";
import type { LabType, NodeHealth, NodeStatus } from "@vlab/shared/enums";
import db from "@backend/db";
import { startInterfaceMonitor } from "./network-monitor";

let initialized = false;

async function handleDockerEvent(event: ContainerEvent) {
	const key = event.Action.startsWith("health_status:")
		? "health_status"
		: event.Action;
	if (!isKey(key, containerHandler)) return;

	try {
		await containerHandler[key](event);
	} catch (error) {
		logger.error({ err: error }, "Error handling docker event");
	}
}

async function initializeData() {
	logger.info("Initializing Docker Monitor...");

	const containers = await docker.listContainers();
	const sessionsToCreate: InferInsertModel<typeof labSessions>[] = [];
	const nodesToCreate: InferInsertModel<typeof labNodes>[] = [];
	const nodeIds: string[] = [];

	for (const container of containers) {
		if (!("Health" in container)) continue;

		const health = container.Health as ContainerInspectInfo["State"]["Health"];
		const healthStatus = health?.Status === "none" ? null : health?.Status;

		const {
			[LABELS.NODE_ID]: nodeId,
			[LABELS.CLAB_NODE_NAME]: name,
			[LABELS.DEVICE_ID]: deviceId,
			[LABELS.SESSION_ID]: sessionId,
			[LABELS.LAB_TYPE]: type,
			[LABELS.LAB_ID]: labId,
			[LABELS.OWNER_ID]: ownerId
		} = container.Labels;

		const ports: Record<number, number> = {};

		for (const { PublicPort, PrivatePort } of container.Ports) {
			if (!PublicPort) continue;

			ports[PrivatePort] = PublicPort;
		}

		nodeIds.push(nodeId);
		nodesToCreate.push({
			id: nodeId,
			name: name!,
			health: healthStatus as NodeHealth,
			status: container.State as NodeStatus,
			labSessionId: sessionId!,
			deviceId,
			ports,
			interfaces: await extractInterfaces(
				docker.getContainer(container.Id),
				container.NetworkSettings.Networks
			)
		});

		if (!sessionIds.has(sessionId)) {
			sessionIds.add(sessionId);

			sessionsToCreate.push({
				id: sessionId,
				type: type as LabType,
				labId,
				ownerId
			});
		}
	}

	if (sessionsToCreate.length) {
		await db.insert(labSessions).values(sessionsToCreate).onConflictDoNothing();
		await db
			.delete(labSessions)
			.where(notInArray(labSessions.id, Array.from(sessionIds.values())));
	} else {
		await db.delete(labSessions);
	}

	if (nodesToCreate.length) {
		await db.insert(labNodes).values(nodesToCreate).onConflictDoNothing();
	}

	for (const container of containers) {
		await startInterfaceMonitor(
			docker.getContainer(container.Id),
			container.Labels[LABELS.NODE_ID],
			container.NetworkSettings.Networks
		);
	}

	logger.info(
		"Initialization complete (%d sessions, %d nodes)",
		sessionIds.size,
		nodeIds.length
	);
}

export async function startDockerMonitor() {
	if (initialized) return;
	initialized = true;

	await initializeData();

	const stream = await docker.getEvents({
		filters: {
			type: ["container"],
			event: ["create", "destroy", "health_status"]
		}
	});
	stream.on("data", (chunk: string) => {
		try {
			const str = chunk.toString();
			const lines = str.split("\n").filter((l) => l.trim());
			for (const line of lines) {
				handleDockerEvent(JSON.parse(line));
			}
		} catch (err) {
			logger.error({ err }, "Error parsing docker event");
		}
	});

	stream.on("error", (err) => {
		initialized = false;
		logger.error({ err }, "Docker event stream failed, restarting...");
		setTimeout(startDockerMonitor, 5000);
	});
}
