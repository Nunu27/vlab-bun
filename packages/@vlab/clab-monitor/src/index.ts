import EventEmitter from "node:events";
import type { DeviceKind, NodeHealth } from "@vlab/shared/enums";
import type { MaybePromise } from "bun";
import type { ContainerInspectInfo } from "dockerode";
import { LABELS } from "./constants";
import containerHandler from "./container-handler";
import networkMonitor, { getPorts } from "./network-monitor";
import type {
	ContainerEvent,
	Context,
	Events,
	NodeData,
	NodeInfo,
	Options,
	SessionData,
} from "./types";
import { healthyStatus, isKey } from "./utils";

async function handleDockerEvent(ctx: Context, event: ContainerEvent) {
	const { logger } = ctx;

	const key = event.Action.startsWith("health_status:")
		? "health_status"
		: event.Action;
	if (!isKey(key, containerHandler)) return;

	const shouldHandle = event.Actor.Attributes[LABELS.NODE_ID];
	if (!shouldHandle) return;

	try {
		logger.debug("Handling docker event: %s", event.Action);
		await containerHandler[key](ctx, event);
	} catch (error) {
		logger.error({ error }, "Error handling docker event");
	}
}

async function emitInitialState(ctx: Context) {
	const { docker, logger, eventEmitter, sessionIds } = ctx;

	logger.debug("Retrieving initial state...");

	const containers = await docker.listContainers();
	const sessions: SessionData[] = [];
	const nodes: NodeData[] = [];

	for (const container of containers) {
		if (!("Health" in container)) continue;

		const healthData =
			container.Health as ContainerInspectInfo["State"]["Health"];
		const health = healthData
			? healthData.Status === "none"
				? null
				: (healthData.Status as NodeHealth)
			: null;

		const {
			[LABELS.NODE_ID]: id,
			[LABELS.CLAB_NODE_NAME]: name,
			[LABELS.CLAB_NODE_KIND]: deviceKind,
			[LABELS.DEVICE_ID]: deviceId,
			[LABELS.SESSION_ID]: labSessionId,
			[LABELS.LAB_TYPE]: type,
			[LABELS.LAB_ID]: labId,
			[LABELS.OWNER_ID]: ownerId,
		} = container.Labels;

		if (!id || !name || !deviceKind || !labSessionId || !type || !ownerId)
			continue;

		const ports: Record<number, number> = {};

		for (const { PublicPort, PrivatePort } of container.Ports) {
			if (!PublicPort) continue;

			ports[PrivatePort] = PublicPort;
		}

		nodes.push({
			id,
			name,
			health,
			labSessionId,
			deviceId,
			ports,
			interfaces: await networkMonitor.extractInterfaces(
				ctx,
				docker.getContainer(container.Id),
				{ id, health, labSessionId, deviceKind, ports } as NodeInfo,
			),
		});

		if (!sessionIds.has(labSessionId)) {
			sessionIds.add(labSessionId);

			sessions.push({
				id: labSessionId,
				type,
				labId,
				ownerId,
			} as SessionData);
		}

		networkMonitor.start(ctx, docker.getContainer(container.Id), {
			id,
			health,
			labSessionId,
			deviceKind,
			ports,
		} as NodeInfo);
	}

	eventEmitter.emit("snapshot", { sessions, nodes });
}

async function initMonitoring(emitter: EventEmitter<Events>, options: Options) {
	const { docker, logger } = options;
	const sessionIds = new Set<string>();
	const nodeHealths = new Map<string, NodeHealth | null>();
	const healthEmitter = new EventEmitter();

	emitter.on("snapshot", (data) => {
		for (const node of data.nodes) {
			nodeHealths.set(node.id, node.health);

			if (healthyStatus.has(node.health)) {
				healthEmitter.emit(node.id, node.health);
			}
		}
	});

	emitter.on("node-create", (node) => {
		nodeHealths.set(node.id, node.health ?? null);
	});

	emitter.on("node-health", (data) => {
		nodeHealths.set(data.id, data.health);

		if (data.health === "healthy") {
			healthEmitter.emit(data.id, data.health);
		}
	});

	emitter.on("node-remove", (id) => {
		nodeHealths.delete(id);
	});

	const ctx = {
		...options,
		sessionIds,
		eventEmitter: emitter,
		waitForHealth: (
			id: string,
			callback: () => MaybePromise<void>,
			timeoutMs: number = 120000,
		) => {
			if (
				nodeHealths.has(id) &&
				healthyStatus.has(nodeHealths.get(id) || null)
			) {
				callback();
				return () => {};
			}

			logger.debug("Waiting for node %s to become healthy...", id);

			const timer = setTimeout(() => {
				healthEmitter.off(id, handler);
				logger.warn("Timeout waiting for node %s to become healthy", id);
			}, timeoutMs);

			const handler = () => {
				clearTimeout(timer);
				healthEmitter.off(id, handler);
				logger.debug("Node %s is now healthy", id);
				callback();
			};

			healthEmitter.on(id, handler);

			return () => {
				logger.debug("Cancelling wait for node %s to become healthy", id);
				clearTimeout(timer);
				healthEmitter.off(id, handler);
			};
		},
	};

	logger.info("Initializing monitor...");

	await emitInitialState(ctx);
	const stream = await docker.getEvents({
		filters: {
			type: ["container"],
			event: ["create", "destroy", "health_status"],
		},
	});
	stream.on("data", (chunk: string) => {
		try {
			const str = chunk.toString();
			const lines = str.split("\n").filter((l) => l.trim());
			for (const line of lines) {
				handleDockerEvent(ctx, JSON.parse(line));
			}
		} catch (error) {
			logger.error({ error }, "Error parsing docker event");
		}
	});

	stream.on("error", (error) => {
		logger.error({ error }, "Docker event stream failed, restarting...");
		setTimeout(createMonitor, 5000, ctx);
	});

	logger.info("Monitor initialized");

	return emitter;
}

export async function createMonitor(options: Options) {
	const emitter = new EventEmitter<Events>();

	return await initMonitoring(emitter, options);
}

export function getMonitorPorts(kind: DeviceKind) {
	return getPorts(kind);
}
