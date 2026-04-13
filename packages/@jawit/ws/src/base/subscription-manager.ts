export class SubscriptionManager<TTopicData> {
	private counts = new Map<string, { count: number; data: TTopicData }>();

	/**
	 * Increments the subscription count for a topic.
	 * If it's the first subscription, `dataCreator` is called to generate the topic's data.
	 * Returns `{ isFirst: true }` if this is the first subscription to this topic.
	 */
	public subscribe(
		topic: string,
		dataCreator: () => TTopicData,
	): { isFirst: boolean; data: TTopicData } {
		let sub = this.counts.get(topic);
		let isFirst = false;

		if (!sub) {
			sub = { count: 0, data: dataCreator() };
			this.counts.set(topic, sub);
			isFirst = true;
		}

		sub.count++;
		return { isFirst, data: sub.data };
	}

	/**
	 * Decrements the subscription count for a topic.
	 * Returns `{ isLast: true }` if the subscription is now empty.
	 */
	public unsubscribe(topic: string): { isLast: boolean; data?: TTopicData } {
		const sub = this.counts.get(topic);
		if (!sub) return { isLast: false };

		sub.count--;
		if (sub.count === 0) {
			this.counts.delete(topic);
			return { isLast: true, data: sub.data };
		}

		return { isLast: false, data: sub.data };
	}

	/**
	 * Gets the current active topic names.
	 */
	public getTopics(): string[] {
		return Array.from(this.counts.keys());
	}
}
