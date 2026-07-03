import EventEmitter from "node:events";
import containerHandler from "./container-handler";
import networkMonitor from "./network-monitor";
import type {
	ContainerEvent,
	Context,
	Events,
	NodeInfo,
	Options,
} from "./types";
import {
	extractManagementIp,
	healthyStatus,
	isKey,
	resolveNode,
} from "./utils";

async function handleDockerEvent(ctx: Context, event: ContainerEvent) {
	const { logger } = ctx;

	const key = event.Action.startsWith("health_status:")
		? "health_status"
		: event.Action;

	logger.debug("Received docker event: %s", event.Action);
	if (!isKey(key, containerHandler)) return;

	const resolved = resolveNode(ctx.nodeIdLabel, event.Actor.Attributes);
	if (!resolved) return;

	try {
		logger.debug("Handling docker event: %s", event.Action);
		// biome-ignore lint/suspicious/noExplicitAny: generic event handler mapping
		await containerHandler[key](ctx, event as any);
	} catch (error) {
		logger.error({ err: error }, "Error handling docker event");
	}
}

async function emitInitialState(ctx: Context) {
	const { docker, logger, eventEmitter } = ctx;

	logger.debug("Retrieving initial state...");

	const containers = await docker.listContainers();

	for (const container of containers) {
		const resolved = resolveNode(ctx.nodeIdLabel, container.Labels);
		if (!resolved) continue;

		const containerHandle = docker.getContainer(container.Id);
		const info = await containerHandle.inspect();
		const health = info.State.Health?.Status ?? null;

		const ip = extractManagementIp(info.NetworkSettings);
		if (!ip) continue;

		const nodeInfo: NodeInfo = {
			id: resolved.id,
			health,
			deviceKind: resolved.deviceKind,
			ip,
		};

		const interfaces = await networkMonitor.extractInterfaces(
			ctx,
			containerHandle,
			nodeInfo,
		);

		eventEmitter.emit("node-create", {
			...nodeInfo,
			name: resolved.name,
			containerId: container.Id,
			interfaces,
		});
		eventEmitter.emit("health-update", {
			id: nodeInfo.id,
			health: nodeInfo.health,
		});
		networkMonitor.start(ctx, containerHandle, nodeInfo);
	}
}

async function initMonitoring(
	emitter: EventEmitter<Events>,
	healthEmitter: EventEmitter,
	nodeHealths: Map<string, string | null>,
	nodeInterfaceMap: Map<string, Record<string, string[]>>,
	options: Options,
) {
	const { docker, logger } = options;

	emitter.on("health-update", (data) => {
		nodeHealths.set(data.id, data.health);
		healthEmitter.emit(data.id, data.health);
	});

	emitter.on("node-remove", (id) => {
		nodeHealths.delete(id);
	});

	const ctx = {
		...options,
		nodeInterfaceMap,
		eventEmitter: emitter,
		emitInterfaceUpdate: (data: {
			id: string;
			interfaces: Record<string, string[]>;
		}) => emitter.emit("interface-update", data),
	};

	const startStream = async (isRestart = false) => {
		try {
			logger.info(
				isRestart ? "Restarting monitor..." : "Initializing monitor...",
			);

			await emitInitialState(ctx);
			const stream = await docker.getEvents({
				filters: {
					type: ["container"],
					event: ["create", "destroy", "health_status"],
				},
			});

			stream.on("data", async (chunk: string) => {
				try {
					const str = chunk.toString();
					const lines = str.split("\n").filter((l) => l.trim());
					for (const line of lines) {
						await handleDockerEvent(ctx, JSON.parse(line));
					}
				} catch (error) {
					logger.error({ err: error }, "Error parsing docker event");
				}
			});

			stream.on("error", (error) => {
				logger.error(
					{ err: error },
					"Docker event stream failed, restarting...",
				);
				setTimeout(() => startStream(true), 5000);
			});

			logger.info("Monitor initialized");
		} catch (error) {
			if (isRestart) {
				logger.error(
					{ err: error },
					"Failed to restart monitor, retrying in 5s...",
				);
				setTimeout(() => startStream(true), 5000);
			} else {
				throw error;
			}
		}
	};

	await startStream();

	return emitter;
}

export function createMonitor(options: Options) {
	const emitter = new EventEmitter<Events>();
	const nodeInterfaceMap = new Map<string, Record<string, string[]>>();
	const nodeHealths = new Map<string, string | null>();
	const healthEmitter = new EventEmitter();

	// Self-heal against a dropped `health_status` docker event: reconcile the
	// node's real health via a single inspect call right as we start waiting,
	// instead of trusting the event stream never missed one. One-shot, not a
	// poll loop — subsequent transitions still arrive via `healthEmitter`.
	const reconcileHealth = async (id: string) => {
		try {
			const containers = await options.docker.listContainers({
				filters: { label: [`${options.nodeIdLabel}=${id}`] },
			});
			const containerInfo = containers[0];
			if (!containerInfo) return;

			const info = await options.docker
				.getContainer(containerInfo.Id)
				.inspect();
			const health = info.State.Health?.Status ?? null;

			if (nodeHealths.get(id) !== health) {
				emitter.emit("health-update", { id, health });
			}
		} catch (error) {
			options.logger.warn(
				{ err: error, nodeId: id },
				"Failed to reconcile node health via inspect",
			);
		}
	};

	const waitForHealth = (
		id: string,
		timeoutMs = 120000,
		signal?: AbortSignal,
	): Promise<void> => {
		if (nodeHealths.has(id)) {
			const currentHealth = nodeHealths.get(id) ?? null;
			if (healthyStatus.has(currentHealth)) return Promise.resolve();
			if (currentHealth === "unhealthy") {
				return Promise.reject(new Error(`Node ${id} is unhealthy`));
			}
		}

		return new Promise<void>((resolve, reject) => {
			options.logger.debug("Waiting for node %s to become healthy...", id);

			const cleanup = () => {
				clearTimeout(timer);
				healthEmitter.off(id, handler);
				signal?.removeEventListener("abort", onAbort);
			};

			// timeoutMs <= 0 (or non-finite) means: wait indefinitely, only
			// cancelable via the abort signal. Used by callers that must not
			// proceed until the node is actually confirmed healthy.
			const timer =
				Number.isFinite(timeoutMs) && timeoutMs > 0
					? setTimeout(() => {
							cleanup();
							options.logger.warn(
								"Timeout waiting for node %s to become healthy",
								id,
							);
							reject(
								new Error(`Timed out waiting for node ${id} to become healthy`),
							);
						}, timeoutMs)
					: undefined;

			const handler = (health: string | null) => {
				if (healthyStatus.has(health)) {
					cleanup();
					options.logger.debug("Node %s is now healthy", id);
					resolve();
				} else if (health === "unhealthy") {
					cleanup();
					reject(new Error(`Node ${id} became unhealthy`));
				}
			};

			const onAbort = () => {
				cleanup();
				options.logger.debug(
					"Cancelling wait for node %s to become healthy",
					id,
				);
				reject(signal?.reason ?? new Error(`Wait for node ${id} was aborted`));
			};

			if (signal) {
				if (signal.aborted) return onAbort();
				signal.addEventListener("abort", onAbort);
			}

			healthEmitter.on(id, handler);
			void reconcileHealth(id);
		});
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
				options,
			),
	};
}
