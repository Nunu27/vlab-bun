import type { MaybePromise } from "bun";

export default class Debouncer {
	constructor(private readonly delay: number) {}

	private map = new Map<
		string,
		{
			timeout: NodeJS.Timeout;
			resolve: () => void;
			reject: (reason?: any) => void;
		}
	>();

	public run(id: string, callback: () => MaybePromise<void>): Promise<void> {
		return new Promise((resolve, reject) => {
			const entry = this.map.get(id);

			if (entry) {
				clearTimeout(entry.timeout);
				entry.resolve();
			}

			const timeout = setTimeout(async () => {
				this.map.delete(id);
				try {
					await callback();
					resolve();
				} catch (err) {
					reject(err);
				}
			}, this.delay);

			this.map.set(id, { timeout, resolve, reject });
		});
	}
}
