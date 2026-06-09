import EventEmitter from "node:events";
import type { MaybePromise } from "bun";
import type { ContainerInspectInfo } from "dockerode";
import containerHandler from "./container-handler";
import networkMonitor from "./network-monitor";
import type {
	ContainerEvent,
	Context,
	Events,
	FullMappingConstraint,
	NodeData,
	NodeInfo,
	Options,
	ResolvedMapping,
	SessionData,
} from "./types";
import {
	buildResolvedData,
	extractManagementIp,
	healthyStatus,
	isKey,
} from "./utils";

async function handleDockerEvent<TFullMapping extends FullMappingConstraint>(
	ctx: Context<TFullMapping>,
	event: ContainerEvent,
) {
	const { logger } = ctx;

	const key = event.Action.startsWith("health_status:")
		? "health_status"
		: event.Action;

	logger.debug("Received docker event: %s", event.Action);
	if (!isKey(key, containerHandler)) return;

	const resolved = buildResolvedData(ctx.mapping, event.Actor.Attributes);
	if (!resolved) return;

	if (ctx.filter && !ctx.filter(resolved)) return;

	try {
		logger.debug("Handling docker event: %s", event.Action);
		await containerHandler[key](ctx, event);
	} catch (error) {
		logger.error({ error }, "Error handling docker event");
	}
}

async function emitInitialState<TFullMapping extends FullMappingConstraint>(
	ctx: Context<TFullMapping>,
) {
	const { docker, logger, eventEmitter, sessionIds } = ctx;

	logger.debug("Retrieving initial state...");

	const containers = await docker.listContainers();
	const sessions: SessionData<TFullMapping>[] = [];
	const nodes: NodeData<TFullMapping>[] = [];
	const staleSessions = new Set<string>();

	for (const container of containers) {
		const resolved = buildResolvedData(ctx.mapping, container.Labels);
		if (!resolved) continue;

		if (ctx.filter && !ctx.filter(resolved)) continue;

		if (ctx.isTemp?.(resolved) || ctx.isStale?.(resolved)) {
			if (!staleSessions.has(resolved.sessionId)) {
				staleSessions.add(resolved.sessionId);
				logger.warn(
					{ sessionId: resolved.sessionId },
					"Detected stale session during hydration, will destroy",
				);
				eventEmitter.emit("stale-session", resolved.sessionId);
			}
			continue;
		}

		if (!("Health" in container)) continue;

		const healthData =
			container.Health as ContainerInspectInfo["State"]["Health"];
		const health = healthData?.Status ?? null;

		const ip = extractManagementIp(container.NetworkSettings);
		if (!ip) continue;

		const isTemp = ctx.isTemp ? ctx.isTemp(resolved) : false;

		const nodeInfo: NodeInfo = {
			id: resolved.nodeId,
			health: healthData?.Status ?? null,
			labSessionId: resolved.sessionId,
			deviceKind: resolved.deviceKind,
			ip,
			isTemp,
		};

		const {
			sessionId,
			nodeId,
			name,
			deviceKind: _dk,
			...userResolved
		} = resolved;
		const nodeData: NodeData<TFullMapping> = {
			...(userResolved as unknown as ResolvedMapping<TFullMapping>),
			id: resolved.nodeId,
			name: resolved.name,
			health,
			labSessionId: resolved.sessionId,
			containerId: container.Id,
			ip,
			interfaces: await networkMonitor.extractInterfaces(
				ctx,
				docker.getContainer(container.Id),
				nodeInfo,
			),
		};

		nodes.push(nodeData);

		if (!isTemp && !sessionIds.has(resolved.sessionId)) {
			sessionIds.add(resolved.sessionId);

			const {
				sessionId: _si,
				nodeId: _ni,
				name: _n,
				deviceKind: _dkk,
				...sessionUserResolved
			} = resolved;
			sessions.push({
				...(sessionUserResolved as unknown as ResolvedMapping<TFullMapping>),
				id: resolved.sessionId,
			});
		}

		networkMonitor.start(ctx, docker.getContainer(container.Id), nodeInfo);
	}

	eventEmitter.emit("snapshot", { sessions, nodes });
}

async function initMonitoring<TFullMapping extends FullMappingConstraint>(
	emitter: EventEmitter<Events<TFullMapping>>,
	healthEmitter: EventEmitter,
	nodeHealths: Map<string, string | null>,
	nodeInterfaceMap: Map<string, Record<string, string[]>>,
	waitForHealth: Context<TFullMapping>["waitForHealth"],
	options: Options<TFullMapping>,
) {
	const { docker, logger } = options;
	const sessionIds = new Set<string>();

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
		nodeInterfaceMap,
		eventEmitter: emitter,
		waitForHealth,
		emitInterfaceUpdate: (
			data: {
				id: string;
				labSessionId: string;
				interfaces: Record<string, string[]>;
			},
			isTemp: boolean,
		) => emitter.emit("interface-update", data, isTemp),
	};

	const startStream = async (isRestart = false) => {
		try {
			logger.info(
				isRestart ? "Restarting monitor..." : "Initializing monitor...",
			);

			await emitInitialState(ctx as Context<TFullMapping>);
			const stream = await docker.getEvents({
				filters: {
					type: ["container"],
					event: ["create", "die", "health_status"],
				},
			});

			stream.on("data", (chunk: string) => {
				try {
					const str = chunk.toString();
					const lines = str.split("\n").filter((l) => l.trim());
					for (const line of lines) {
						handleDockerEvent(ctx as Context<TFullMapping>, JSON.parse(line));
					}
				} catch (error) {
					logger.error({ error }, "Error parsing docker event");
				}
			});

			stream.on("error", (error) => {
				logger.error({ error }, "Docker event stream failed, restarting...");
				setTimeout(() => startStream(true), 5000);
			});

			logger.info("Monitor initialized");
		} catch (error) {
			if (isRestart) {
				logger.error({ error }, "Failed to restart monitor, retrying in 5s...");
				setTimeout(() => startStream(true), 5000);
			} else {
				throw error;
			}
		}
	};

	await startStream();

	return emitter;
}

export function createMonitor<TFullMapping extends FullMappingConstraint>(
	options: Options<TFullMapping>,
) {
	const emitter = new EventEmitter<Events<TFullMapping>>();
	const nodeInterfaceMap = new Map<string, Record<string, string[]>>();
	const nodeHealths = new Map<string, string | null>();
	const healthEmitter = new EventEmitter();

	const waitForHealth = (
		id: string,
		callback: () => MaybePromise<void>,
		timeoutMs: number = 120000,
	) => {
		if (nodeHealths.has(id) && healthyStatus.has(nodeHealths.get(id) || null)) {
			callback();
			return () => {};
		}

		options.logger.debug("Waiting for node %s to become healthy...", id);

		const timer = setTimeout(() => {
			healthEmitter.off(id, handler);
			options.logger.warn("Timeout waiting for node %s to become healthy", id);
		}, timeoutMs);

		const handler = () => {
			clearTimeout(timer);
			healthEmitter.off(id, handler);
			options.logger.debug("Node %s is now healthy", id);
			callback();
		};

		healthEmitter.on(id, handler);

		return () => {
			options.logger.debug("Cancelling wait for node %s to become healthy", id);
			clearTimeout(timer);
			healthEmitter.off(id, handler);
		};
	};

	return {
		emitter,
		nodeInterfaceMap,
		isNodeHealthy: (id: string) => {
			return nodeHealths.get(id) === "healthy";
		},
		waitForHealth,
		init: () =>
			initMonitoring(
				emitter,
				healthEmitter,
				nodeHealths,
				nodeInterfaceMap,
				waitForHealth,
				options,
			),
	};
}
