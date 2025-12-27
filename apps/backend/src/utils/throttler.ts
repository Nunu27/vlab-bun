import type { MaybePromise } from "bun";

export default class Throttler {
	constructor(private readonly delay: number) {}

	private map = new Map<
		string,
		{ timeout: NodeJS.Timeout; promise: MaybePromise<void> }
	>();
	private callbacks = new Map<string, () => MaybePromise<void>>();

	public async wait(
		id: string,
		callback?: { id: string; execute: () => MaybePromise<void> }
	) {
		const entry = this.map.get(id);
		const callbackId = `${id}:${callback?.id}`;

		if (callback) {
			this.callbacks.set(callbackId, callback.execute);
		}

		if (entry) await entry.promise;

		const cb = this.callbacks.get(callbackId);
		if (cb && cb === callback?.execute) {
			await cb();
		}
	}

	public async run(id: string, promise: () => MaybePromise<void>) {
		const entry = this.map.get(id);
		const currentPromise = entry?.promise ?? promise();

		if (entry) clearTimeout(entry.timeout);

		this.map.set(id, {
			timeout: setTimeout(() => {
				this.map.delete(id);
			}, this.delay),
			promise: currentPromise
		});

		return await currentPromise;
	}
}
