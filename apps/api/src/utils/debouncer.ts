import type { MaybePromise } from "bun";

export default class Debouncer<TReturn = void> {
	constructor(private readonly delay: number) {}

	private map = new Map<
		string,
		{
			timeout: NodeJS.Timeout;
			resolve: (value: TReturn | PromiseLike<TReturn>) => void;
			// biome-ignore lint/suspicious/noExplicitAny: required for generic reject
			reject: (reason?: any) => void;
		}
	>();

	public run(id: string, callback: () => MaybePromise<TReturn>) {
		const entry = this.map.get(id);
		clearTimeout(entry?.timeout);

		const promise = new Promise<TReturn>((resolve, reject) => {
			const timeout = setTimeout(async () => {
				this.map.delete(id);
				try {
					resolve(await callback());
				} catch (err) {
					reject(err);
				}
			}, this.delay);

			this.map.set(id, { timeout, resolve, reject });
		});

		if (entry) entry.resolve(promise);
		return promise;
	}

	public cancel(id: string) {
		const entry = this.map.get(id);

		if (entry) {
			entry.reject();
			clearTimeout(entry.timeout);
			this.map.delete(id);
		}
	}
}

export function debounce<
	TFunc extends (...args: unknown[]) => MaybePromise<TReturn>,
	TReturn = void,
>(func: TFunc, delay: number) {
	let timeout: NodeJS.Timeout | undefined;
	let resolveCurrent:
		| ((value: TReturn | PromiseLike<TReturn>) => void)
		| undefined;

	return (...args: Parameters<TFunc>) => {
		clearTimeout(timeout);

		const promise = new Promise<TReturn>((resolve, reject) => {
			timeout = setTimeout(async () => {
				try {
					resolve(await func(...args));
				} catch (error) {
					reject(error);
				}
				timeout = undefined;
				resolveCurrent = undefined;
			}, delay);
		});

		resolveCurrent?.(promise);
		return promise;
	};
}
