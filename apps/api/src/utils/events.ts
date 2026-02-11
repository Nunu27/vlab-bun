import type { TypedEventEmitter } from "@api/types/events";

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
	emitter: TypedEventEmitter<T>,
	event: E,
	config?: EventWaitConfig<T[E][0], TResult>,
): Promise<TResult | undefined> {
	const { predicate, timeout = 5000, defaultValue } = config ?? {};

	return new Promise((resolve) => {
		let resolved = false;

		const timer = timeout
			? setTimeout(() => {
					if (!resolved) {
						resolved = true;
						emitter.off(event, handler as (...args: T[E]) => void);
						resolve(defaultValue);
					}
				}, timeout)
			: null;

		const handler = (...args: unknown[]) => {
			if (resolved) return;

			const data = args[0] as T[E][0];
			const result = predicate ? predicate(data) : (data as unknown as TResult);

			if (predicate && result === undefined) return;

			resolved = true;
			if (timer) clearTimeout(timer);
			emitter.off(event, handler as (...args: T[E]) => void);
			resolve(result as TResult);
		};

		emitter.on(event, handler as (...args: T[E]) => void);
	});
}
