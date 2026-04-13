export type DevLogEntry = {
	type: "incoming" | "outgoing";
	event: string;
	args: unknown[];
};

export type DevtoolsSubscriptionInfo = {
	topic: string;
	createdAt: number;
	lastDataAt?: number;
	lastData?: unknown;
};

export class DevtoolsObserver {
	private readonly logHandlers = new Set<(log: DevLogEntry) => void>();
	private readonly subHandlers = new Set<() => void>();
	private subscriptions = new Map<string, DevtoolsSubscriptionInfo>();
	private cachedSubscriptionSnapshot: DevtoolsSubscriptionInfo[] = [];

	public log(entry: DevLogEntry) {
		for (const handler of this.logHandlers) {
			handler(entry);
		}
	}

	public subscribeLogs(handler: (entry: DevLogEntry) => void) {
		this.logHandlers.add(handler);
		return () => this.logHandlers.delete(handler);
	}

	public syncSubscriptions(topics: string[]) {
		const now = Date.now();
		const currentTopics = new Set(topics);

		// Remove stale subscriptions
		for (const topic of this.subscriptions.keys()) {
			if (!currentTopics.has(topic)) {
				this.subscriptions.delete(topic);
			}
		}

		// Add new subscriptions
		for (const topic of topics) {
			if (!this.subscriptions.has(topic)) {
				this.subscriptions.set(topic, {
					topic,
					createdAt: now,
				});
			}
		}

		this.notifySubscriptionsChanged();
	}

	public updateSubscriptionData(topic: string, data: unknown) {
		const sub = this.subscriptions.get(topic);
		if (sub) {
			sub.lastDataAt = Date.now();
			sub.lastData = data;
			this.notifySubscriptionsChanged();
		}
	}

	private notifySubscriptionsChanged() {
		this.cachedSubscriptionSnapshot = Array.from(this.subscriptions.values());
		for (const handler of this.subHandlers) {
			handler();
		}
	}

	public subscribeSubscriptions(handler: () => void) {
		this.subHandlers.add(handler);
		return () => this.subHandlers.delete(handler);
	}

	public getSubscriptionSnapshot(): DevtoolsSubscriptionInfo[] {
		return this.cachedSubscriptionSnapshot;
	}
}
