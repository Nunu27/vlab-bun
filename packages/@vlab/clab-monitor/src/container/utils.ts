import type { MaybePromise } from "bun";
import type { ContainerInfo } from "dockerode";
import { NODE_HEALTH_STATUS } from "../constants";
import type { Context, NodeCredentials, NodeHealth } from "../types";

export function formatHealth(health: string | null | undefined): NodeHealth {
	if (NODE_HEALTH_STATUS.has(health)) return health as NodeHealth;
	return null;
}

export function extractManagementIp(
	networkSettings: ContainerInfo["NetworkSettings"],
) {
	const networks = networkSettings?.Networks;
	if (!networks) return null;

	const keys = Object.keys(networks);
	if (keys.length === 0) return null;

	for (const [key, network] of Object.entries(networks)) {
		if (
			network.IPAddress &&
			(key.includes("clab") || key === "bridge" || key === "management")
		) {
			return network.IPAddress;
		}
	}

	for (const network of Object.values(networks)) {
		if (network.IPAddress) return network.IPAddress;
	}

	return null;
}

export function extractCredentials(env: string[]): NodeCredentials {
	const vars: Record<string, string> = {};

	for (const entry of env ?? []) {
		const index = entry.indexOf("=");
		if (index === -1) continue;
		vars[entry.slice(0, index)] = entry.slice(index + 1);
	}

	return {
		username: vars.USERNAME,
		password: vars.PASSWORD,
	};
}

interface QueueItem<T> {
	run: () => Promise<void>;
	resolve: (value: T) => void;
	reject: (reason: unknown) => void;
}

export class KeyedQueue {
	private readonly queues = new Map<string, QueueItem<unknown>[]>();
	private readonly running = new Set<string>();
	private readonly logger: Context["logger"] | undefined;

	constructor(options?: { logger?: Context["logger"] }) {
		this.logger = options?.logger;
	}

	public enqueue<TArgs extends unknown[], TResult>(
		key: string,
		fn: (...args: TArgs) => MaybePromise<TResult>,
		...args: TArgs
	): Promise<TResult> {
		return new Promise<TResult>((resolve, reject) => {
			const item: QueueItem<TResult> = {
				resolve,
				reject,
				run: async () => {
					try {
						const result = await fn(...args);
						resolve(result);
					} catch (err) {
						reject(err);
					}
				},
			};

			const queue =
				(this.queues.get(key) as QueueItem<TResult>[] | undefined) ?? [];

			queue.push(item);

			if (!this.queues.has(key)) {
				this.queues.set(key, queue as QueueItem<unknown>[]);
			}

			if (!this.running.has(key)) {
				void this.process(key);
			}
		});
	}

	private async process(key: string): Promise<void> {
		this.running.add(key);

		const queue = this.queues.get(key);

		if (!queue) {
			this.running.delete(key);
			return;
		}

		while (queue.length > 0) {
			const item = queue.shift();
			if (!item) continue;

			await item.run().catch((err) => {
				this.logger?.error({ err, key }, "Error processing queue item");
			});
		}

		this.running.delete(key);

		if (queue.length === 0) {
			this.queues.delete(key);
		} else {
			// Handle race where new items were added after the loop exited.
			void this.process(key);
		}
	}

	public has(key: string): boolean {
		return this.queues.has(key);
	}

	public size(key: string): number {
		return this.queues.get(key)?.length ?? 0;
	}

	public clear(key: string): void {
		this.queues.delete(key);
		this.running.delete(key);
	}

	public clearAll(): void {
		this.queues.clear();
		this.running.clear();
	}
}
