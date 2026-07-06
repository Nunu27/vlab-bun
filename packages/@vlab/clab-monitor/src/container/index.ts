import type { Readable } from "node:stream";
import { CLAB_LABELS } from "../constants";
import network from "../network";
import type { Context, DockerContainerEvent, NodeInfo } from "../types";
import handlers from "./handlers";
import {
	extractCredentials,
	extractManagementIp,
	formatHealth,
	KeyedQueue,
} from "./utils";

const RECONNECT_DELAY = 3_000;

function resolveNode(
	id: string,
	labels: Record<string, string>,
): NodeInfo | null {
	const kind = labels[CLAB_LABELS.KIND];
	const lab = labels[CLAB_LABELS.LAB];
	const name = labels[CLAB_LABELS.NAME];

	if (!kind || !lab || !name) return null;

	return { id, kind, lab, name };
}

export function createDockerEventMonitor(ctx: Context) {
	const { docker, logger, emitter, nodes } = ctx;

	let running = false;
	let reconnecting = false;

	let stream: Readable | null = null;
	let controller: AbortController | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	const queue = new KeyedQueue({ logger });

	async function rehydrate(): Promise<void> {
		network.stopAll(ctx);

		const containers = await docker.listContainers({ all: true });

		for (const { Id, Labels } of containers) {
			const node = resolveNode(Id, Labels);
			if (!node) continue;

			const container = docker.getContainer(node.id);
			const info = await container.inspect();

			const health = formatHealth(info.State.Health?.Status);
			const ip = extractManagementIp(info.NetworkSettings);
			if (!ip) {
				logger?.warn(
					`[rehydrate] No management IP found for node ${node.id}, skipping`,
				);
				continue;
			}

			nodes.add(node.id);
			emitter.emit("health-update", node, health);
			network.start(ctx, {
				container: docker.getContainer(node.id),
				info: node,
				details: { ip, credentials: extractCredentials(info.Config.Env) },
			});
		}

		if (nodes.size) {
			logger?.debug(`[rehydrate] Rehydrated ${nodes.size} nodes`);
		}
	}

	async function connect(): Promise<void> {
		if (!running) return;

		try {
			logger?.debug("Connecting to Docker events");

			stream = (await docker.getEvents({
				filters: {
					type: ["container"],
					event: ["start", "health_status", "kill", "die", "destroy"],
				},
			})) as Readable;

			logger?.debug("Connected to Docker events");

			let buffer = "";

			// Events received while rehydrating are queued here instead of being
			// processed immediately: rehydrate() mutates `nodes` and starts/stops
			// network monitors directly (outside the KeyedQueue), so handling a
			// live event concurrently with it could race (e.g. a duplicate network
			// monitor). They're drained in order once rehydrate() finishes.
			let rehydrating = true;
			const pending: Array<{ event: DockerContainerEvent; node: NodeInfo }> =
				[];

			const dispatch = (event: DockerContainerEvent, node: NodeInfo) => {
				const key = event.Action.startsWith("health_status:")
					? "health_status"
					: event.Action;

				const handler = handlers[key];
				if (!handler) return;

				logger?.debug(`[event] Handling ${event.Action} event from ${node.id}`);

				queue.enqueue(node.id, handler, ctx, event, node);
			};

			const cleanup = () => {
				if (!stream) {
					return;
				}

				stream.off("data", onData);
				stream.off("error", onError);
				stream.off("end", onEnd);
				stream.off("close", onClose);
			};

			const scheduleReconnect = () => {
				if (!running || reconnecting) {
					return;
				}

				reconnecting = true;

				cleanup();

				logger?.warn(
					{ retryIn: RECONNECT_DELAY },
					"Docker event stream disconnected, reconnecting",
				);

				reconnectTimer = setTimeout(async () => {
					reconnectTimer = null;
					reconnecting = false;

					await connect();
				}, RECONNECT_DELAY);
			};

			const onData = (chunk: Buffer) => {
				buffer += chunk.toString("utf8");

				while (true) {
					const newline = buffer.indexOf("\n");

					if (newline === -1) {
						break;
					}

					const line = buffer.slice(0, newline);
					buffer = buffer.slice(newline + 1);

					if (!line.trim()) {
						continue;
					}

					try {
						const event: DockerContainerEvent = JSON.parse(line);

						const node = resolveNode(event.Actor.ID, event.Actor.Attributes);
						if (!node) continue;

						if (rehydrating) {
							pending.push({ event, node });
							continue;
						}

						dispatch(event, node);
					} catch (err) {
						logger?.error({ err, line }, "Failed to parse Docker event");
					}
				}
			};

			const onError = (err: Error) => {
				logger?.error({ err }, "Docker event stream error");
			};

			const onEnd = () => {
				logger?.warn("Docker event stream ended");
				scheduleReconnect();
			};

			const onClose = () => {
				logger?.warn("Docker event stream closed");
				scheduleReconnect();
			};

			stream.on("data", onData);
			stream.on("error", onError);
			stream.on("end", onEnd);
			stream.on("close", onClose);

			controller?.signal.addEventListener(
				"abort",
				() => {
					cleanup();

					if (stream && !stream.destroyed) {
						stream.destroy();
					}
				},
				{ once: true },
			);

			logger?.debug("Rehydrating");
			await rehydrate();
			rehydrating = false;

			for (const { event, node } of pending) {
				dispatch(event, node);
			}
			pending.length = 0;
		} catch (err) {
			logger?.error({ err }, "Failed to connect to Docker events");

			if (!running || reconnecting) {
				return;
			}

			reconnecting = true;

			logger?.warn(
				{ retryIn: RECONNECT_DELAY },
				"Retrying Docker event connection",
			);

			reconnectTimer = setTimeout(async () => {
				reconnectTimer = null;
				reconnecting = false;

				await connect();
			}, RECONNECT_DELAY);
		}
	}

	return {
		async start() {
			if (running) return;

			running = true;
			controller = new AbortController();

			await connect();
		},

		async stop() {
			if (!running) return;

			running = false;

			controller?.abort();
			queue.clearAll();

			if (reconnectTimer) {
				clearTimeout(reconnectTimer);
				reconnectTimer = null;
			}

			stream = null;
			controller = null;
			reconnecting = false;

			logger?.info("Stopped Docker event monitor");
		},
	};
}
