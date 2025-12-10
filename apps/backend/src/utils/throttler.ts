import type { MaybePromise } from "bun";

export default class Throttler {
	constructor(private readonly delay: number) {}

	private map = new Map<
		string,
		{ timeout: NodeJS.Timeout; promise: MaybePromise<void> }
	>();

	public async wait(id: string) {
		const entry = this.map.get(id);

		if (entry) {
			return await entry.promise;
		}
	}

	public async run(id: string, promise: () => MaybePromise<void>) {
		const entry = this.map.get(id);
		const currentPromise = entry?.promise ?? promise();
		this.map.set(id, {
			timeout: setTimeout(() => {
				this.map.delete(id);
			}, this.delay),
			promise: currentPromise
		});

		return await currentPromise;
	}
}
