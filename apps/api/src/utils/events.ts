import type { EventEmitter } from "node:events";

type EventWaitConfig<TData, TResult = TData> = {
	predicate?: (value: TData) => TResult | undefined;
	timeout?: number;
	defaultValue?: TResult;
};

export function waitForEvent<
	T extends Record<string, unknown[]>,
	E extends keyof T & string,
	TResult = T[E][0],
>(
	emitter: EventEmitter<T>,
	event: E,
	config?: EventWaitConfig<T[E][0], TResult>,
): Promise<TResult | undefined> {
	const { predicate, timeout = 5000, defaultValue } = config ?? {};

	return new Promise<TResult | undefined>((resolve) => {
		let resolved = false;

		const timer = timeout
			? setTimeout(() => {
					if (!resolved) {
						resolved = true;
						// @ts-expect-error - Event type resolution is too complex for TS here
						emitter.off(event, handler);
						resolve(defaultValue);
					}
				}, timeout)
			: null;

		const handler = (...args: T[E]) => {
			if (resolved) return;

			const data = args[0] as T[E][0];
			const result = predicate ? predicate(data) : (data as unknown as TResult);

			if (predicate && result === undefined) return;

			resolved = true;
			if (timer) clearTimeout(timer);
			// @ts-expect-error - Event type resolution is too complex for TS here
			emitter.off(event, handler);
			resolve(result as TResult);
		};

		// @ts-expect-error - Event type resolution is too complex for TS here
		emitter.on(event, handler);
	});
}
