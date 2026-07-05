import { EventEmitter } from "node:events";
import { HEALTHY_STATUS, TERMINAL_HEALTH_STATUS } from "./constants";
import { createDockerEventMonitor } from "./container";
import type { Context, Events, NodeHealth } from "./types";

export { HEALTHY_STATUS, TERMINAL_HEALTH_STATUS } from "./constants";
export { formatHealth } from "./container/utils";
export type { Events, NodeHealth, NodeInfo, NodeInterfaces } from "./types";

export function createMonitor(options: Pick<Context, "docker" | "logger">) {
	const { logger } = options;

	const nodeHealths = new Map<string, NodeHealth>();
	const healthWaiters = new Map<
		string,
		Set<// biome-ignore lint/suspicious/noExplicitAny: Promise resolver type
		{ resolve: () => void; reject: (reason?: any) => void }>
	>();

	// Exposed API
	const emitter = new EventEmitter<Events>();
	const nodes = new Set<string>();
	const interfaceMap = new Map<string, Record<string, string[]>>();
	const isNodeHealthy = (id: string) => HEALTHY_STATUS.has(nodeHealths.get(id));
	const waitForHealth = async (
		id: string,
		options?: { timeout?: number; signal?: AbortSignal },
	) => {
		if (!nodes.has(id)) throw new Error(`Node ${id} is not monitored`);
		if (HEALTHY_STATUS.has(nodeHealths.get(id))) return;

		return new Promise<void>((resolve, reject) => {
			logger?.debug(`Waiting for node ${id} to become healthy`);
			const { timeout = 0, signal } = options ?? {};

			const waiters = healthWaiters.get(id) ?? new Set();
			healthWaiters.set(id, waiters);

			const timer =
				Number.isFinite(timeout) && timeout > 0
					? setTimeout(() => {
							cleanup();
							reject(
								new Error(`Timed out waiting for node ${id} to become healthy`),
							);
						}, timeout)
					: undefined;

			const cleanup = () => {
				if (timer) clearTimeout(timer);
				waiters.delete(promise);
				if (waiters.size === 0) healthWaiters.delete(id);
			};

			const promise = {
				resolve: () => {
					cleanup();
					resolve();
				},
				// biome-ignore lint/suspicious/noExplicitAny: Promise rejector type
				reject: (reason?: any) => {
					cleanup();
					reject(reason);
				},
			};

			const onAbort = () => {
				logger?.debug(`Aborting wait for node ${id}`);
				promise.reject(
					signal?.reason ?? new Error(`Wait for node ${id} was aborted`),
				);
				signal?.removeEventListener("abort", onAbort);
			};

			if (signal) {
				if (signal.aborted) return onAbort();
				signal.addEventListener("abort", onAbort);
			}

			waiters.add(promise);
		});
	};

	// System
	emitter.on("health-update", ({ id }, health) => {
		if (nodes.has(id)) nodeHealths.set(id, health);
		else nodeHealths.delete(id);

		const waiters = healthWaiters.get(id);
		if (!waiters) return;

		if (HEALTHY_STATUS.has(health)) {
			for (const waiter of [...waiters]) waiter.resolve();
		} else if (TERMINAL_HEALTH_STATUS.has(health)) {
			for (const waiter of [...waiters]) {
				waiter.reject(new Error(`Node ${id} is in terminal state (${health})`));
			}
		}
	});

	return {
		monitor: createDockerEventMonitor({
			emitter,
			interfaceMap,
			nodes,
			waitForHealth,
			...options,
		}),
		emitter,
		nodes,
		interfaceMap,
		health: {
			data: nodeHealths as ReadonlyMap<string, NodeHealth>,
			isHealthy: isNodeHealthy,
			wait: waitForHealth,
		},
	};
}
