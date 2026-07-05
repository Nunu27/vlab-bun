import type { TypedEventEmitter } from "@manager/types/events";

type EventWaitConfig<TData, TResult = TData> = {
	predicate?: (value: TData) => TResult | undefined;
	timeout?: number;
	initialValue?: TData;
	defaultValue?: TResult;
};

export function waitForEvent<
	T extends Record<string, unknown[]>,
	E extends keyof T & string,
	TData = T[E][0],
	TResult = TData,
>(
	emitter: TypedEventEmitter<T>,
	event: E,
	config?: EventWaitConfig<T[E][0], TResult>,
): Promise<TResult | undefined> {
	const {
		predicate,
		timeout = 5000,
		initialValue,
		defaultValue,
	} = config ?? {};

	return new Promise((resolve) => {
		let resolved = false;

		if (initialValue !== undefined) {
			const result = predicate
				? predicate(initialValue)
				: (initialValue as unknown as TResult);

			if (result !== undefined) return resolve(result);
		}

		const timer = timeout
			? setTimeout(() => {
					if (!resolved) {
						resolved = true;
						emitter.off(event, handler);
						resolve(defaultValue);
					}
				}, timeout)
			: null;

		const handler = (...args: T[E]) => {
			if (resolved) return;

			const result = predicate
				? predicate(args[0])
				: (args[0] as unknown as TResult);

			if (predicate && result === undefined) return;

			resolved = true;
			if (timer) clearTimeout(timer);
			emitter.off(event, handler);
			resolve(result);
		};

		emitter.on(event, handler);
	});
}
