import type SocketIOClient from "../../adapter/socket.io/client";
import { DevtoolsObserver } from "../../base/devtools-observer";

export type DevLog = {
	id: string;
	timestamp: number;
	type: "incoming" | "outgoing";
	event: string;
	args: unknown[];
};

export class DevtoolsStore {
	public logs: DevLog[] = [];
	public readonly observer = new DevtoolsObserver();

	private readonly listeners = new Set<() => void>();
	private unsubscribeLogs?: () => void;

	// biome-ignore lint/suspicious/noExplicitAny: generic
	constructor(public readonly client: SocketIOClient<any>) {
		// Attach hooks from the client so that the core client remains decoupled from devtools
		client.metrics = {
			onLog: (entry) => this.observer.log(entry),
			onSubscriptionsChanged: (topics) =>
				this.observer.syncSubscriptions(topics),
			onData: (topic, data) =>
				this.observer.updateSubscriptionData(topic, data),
		};

		this.unsubscribeLogs = this.observer.subscribeLogs(
			(log: Omit<DevLog, "id" | "timestamp">) => {
				this.logs = [
					{
						id: crypto.randomUUID(),
						timestamp: Date.now(),
						...log,
					},
					...this.logs,
				].slice(0, 500);
				this.notify();
			},
		);
	}

	/** Registers a change listener and returns an unsubscribe function (useSyncExternalStore-compatible). */
	subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};

	/** Clears the log history and notifies listeners. */
	clear() {
		this.logs = [];
		this.notify();
	}

	/** Tears down the log subscription. Call this when the store is no longer needed. */
	destroy() {
		this.unsubscribeLogs?.();
		this.unsubscribeLogs = undefined;
		this.listeners.clear();
		if (this.client.metrics) {
			this.client.metrics = undefined;
		}
	}

	private notify() {
		for (const listener of this.listeners) listener();
	}
}

// biome-ignore lint/suspicious/noExplicitAny: generic
const storeCache = new WeakMap<SocketIOClient<any>, DevtoolsStore>();

/**
 * Returns a singleton `DevtoolsStore` for the given client, creating one on
 * first access. The same store instance is reused across React renders.
 */
// biome-ignore lint/suspicious/noExplicitAny: generic
export function getDevtoolsStore(client: SocketIOClient<any>): DevtoolsStore {
	let store = storeCache.get(client);
	if (!store) {
		store = new DevtoolsStore(client);
		storeCache.set(client, store);
	}
	return store;
}
