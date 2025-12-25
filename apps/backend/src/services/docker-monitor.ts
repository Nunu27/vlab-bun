import { LABELS } from "@backend/constants";
import db from "@backend/db";
import {
	labNodes,
	labSessions,
	type LabNodeInterfaceData
} from "@backend/db/schema";
import { deleteCache } from "@backend/middlewares/caching";
import docker from "@backend/services/docker";
import logger from "@backend/services/logger";
import type { DockerEvent } from "@backend/types/docker";
import Debouncer from "@backend/utils/debouncer";
import Throttler from "@backend/utils/throttler";
import type { LabType, NodeHealth, NodeStatus } from "@vlab/shared/enums";
import type { Container, ContainerInspectInfo } from "dockerode";
import { eq, notInArray, type InferInsertModel } from "drizzle-orm";
import { Duplex } from "stream";

let initialized = false;
const sessionIds = new Set<string>();
const sessionThrottler = new Throttler(1000);
const interfaceDebouncer = new Debouncer(750);
const interfaceMonitors = new Map<string, Duplex>();

function isKey<T extends object>(key: PropertyKey, obj: T): key is keyof T {
	return key in obj;
}

// --- Network Monitor ---

async function startInterfaceMonitor(
	container: Container,
	nodeId: string,
	networks: ContainerInspectInfo["NetworkSettings"]["Networks"]
) {
	if (interfaceMonitors.has(nodeId)) return;

	try {
		logger.debug("Starting interface monitor for node %s", nodeId);

		const exec = await container.exec({
			Cmd: ["ip", "monitor", "address", "link"],
			AttachStdout: true,
			AttachStderr: false,
			Tty: false
		});

		const stream = await exec.start({ Detach: false, Tty: false });
		interfaceMonitors.set(nodeId, stream);

		stream.on("data", (chunk: Buffer) => {
			const text = chunk.toString();
			if (!text.trim()) return;
			if (text.includes("OCI runtime exec failed")) {
				return stopInterfaceMonitor(nodeId);
			}

			interfaceDebouncer.run(nodeId, async () => {
				await db
					.update(labNodes)
					.set({ interfaces: await extractInterfaces(container, networks) })
					.where(eq(labNodes.id, nodeId));
			});
		});

		stream.on("end", () => {
			logger.debug("Interface monitor for node %s ended", nodeId);
			return interfaceMonitors.delete(nodeId);
		});
		stream.on("error", () => stopInterfaceMonitor(nodeId));
	} catch (err: any) {
		if (err.statusCode !== 409) {
			logger.error({ err, id: nodeId }, "Failed to start interface monitor");
		}
	}
}

function stopInterfaceMonitor(nodeId: string) {
	const monitor = interfaceMonitors.get(nodeId);

	if (monitor) {
		logger.debug("Stopping interface monitor for node %s", nodeId);
		monitor.destroy();
		interfaceMonitors.delete(nodeId);
	}
}

// --- Event Handlers ---

type ContainerEvent = Extract<DockerEvent, { Type: "container" }>;

function extractPortMappings(inspect: ContainerInspectInfo) {
	const portMappings: Record<number, number> = {};

	for (const [containerPortKey, bindings] of Object.entries(
		inspect.NetworkSettings?.Ports
	)) {
		if (!bindings || bindings.length === 0) continue;

		const containerPort = parseInt(containerPortKey);
		const hostPort = parseInt(bindings[0].HostPort);

		if (!isNaN(containerPort) && !isNaN(hostPort)) {
			portMappings[containerPort] = hostPort;
		}
	}

	return portMappings;
}

async function extractInterfaces(
	container: Container,
	networks: ContainerInspectInfo["NetworkSettings"]["Networks"]
): Promise<Record<string, LabNodeInterfaceData>> {
	const interfaces: Record<string, LabNodeInterfaceData> = {};

	try {
		const exec = await container.exec({
			Cmd: ["ip", "-j", "addr", "show"],
			AttachStdout: true,
			AttachStderr: false,
			Tty: true
		});

		const stream = await exec.start({ Detach: false, Tty: true });
		let output = "";

		await new Promise<void>((resolve, reject) => {
			const timer = setTimeout(() => {
				stream.destroy();
				reject(new Error("Timeout extracting interfaces"));
			}, 3000);

			stream.on("data", (chunk) => (output += chunk.toString()));
			stream.on("end", () => {
				clearTimeout(timer);
				resolve();
			});
			stream.on("error", (err) => {
				clearTimeout(timer);
				reject(err);
			});
		});

		const cleanOutput = output.replace(/^[^{[]+/, "");

		try {
			const data = JSON.parse(cleanOutput);
			for (const iface of data) {
				if (iface.ifname === "lo") continue;

				const ipv4 = iface.addr_info?.find((a: any) => a.family === "inet");

				interfaces[iface.ifname] = {
					state: iface.operstate === "UP" ? "UP" : "DOWN",
					macAddress: iface.address,
					ipAddress: ipv4?.local
				};
			}
			return interfaces;
		} catch (e) {
			logger.debug(
				{ err: e },
				"JSON parsing failed, falling back to filesystem"
			);
			return await extractInterfacesFromFilesystem(container, networks);
		}
	} catch (err: any) {
		if (![409, 404].includes(err.statusCode)) {
			logger.warn({ err, id: container.id }, "Failed to extract interfaces");
		}
	}
	return interfaces;
}

async function extractInterfacesFromFilesystem(
	container: Container,
	networks: ContainerInspectInfo["NetworkSettings"]["Networks"]
) {
	const interfaces: Record<string, LabNodeInterfaceData> = {};
	const macLookup = new Map<string, string>();

	for (const net of Object.values(networks)) {
		if (net?.MacAddress) {
			macLookup.set(net.MacAddress.toLowerCase(), net.IPAddress);
		}
	}

	try {
		const exec = await container.exec({
			Cmd: [
				"sh",
				"-c",
				'for p in /sys/class/net/*; do echo "${p##*/}"; cat "$p/address"; cat "$p/operstate"; echo "__END__"; done'
			],
			AttachStdout: true,
			AttachStderr: false,
			Tty: false
		});

		const stream = await exec.start({ Detach: false, Tty: false });
		let data = "";

		await new Promise<void>((resolve, reject) => {
			stream.on("data", (c) => (data += c.toString()));
			stream.on("end", resolve);
			stream.on("error", reject);
			setTimeout(() => {
				stream.destroy();
				reject(new Error("Timeout"));
			}, 3000);
		});

		const parts = data.split("__END__");
		for (const part of parts) {
			const cleanPart = part.replace(/[\x00-\x1F\x7F]/g, "\n");
			const lines = cleanPart
				.split("\n")
				.map((l) => l.trim())
				.filter(Boolean);

			if (lines.length < 3) continue;

			const name = lines[0];
			if (name === "lo") continue;

			const mac = lines[1].toLowerCase();
			const state = lines[2].toLowerCase();

			interfaces[name] = {
				state: state === "up" ? "UP" : "DOWN",
				macAddress: mac,
				ipAddress: macLookup.get(mac)
			};
		}
	} catch (err: any) {
		if (err.statusCode !== 409) {
			logger.debug({ err }, "Filesystem interface extraction failed");
		}
	}

	return interfaces;
}

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

const eventHandler = {
	create: onContainerCreate,
	destroy: onContainerRemove,
	health_status: onContainerHealthStatus
};

// --- Event Listener ---

async function handleDockerEvent(event: ContainerEvent) {
	const key = event.Action.startsWith("health_status:")
		? "health_status"
		: event.Action;
	if (!isKey(key, eventHandler)) return;

	try {
		await eventHandler[key](event);
	} catch (error) {
		logger.error({ err: error }, "Error handling docker event");
	}
}

// --- Initialization ---

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
