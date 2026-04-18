export function deterministicStringify(obj: unknown): string {
	if (obj === null || obj === undefined) {
		return String(obj);
	}
	if (typeof obj !== "object") {
		return JSON.stringify(obj);
	}
	if (Array.isArray(obj)) {
		return `[${obj.map(deterministicStringify).join(",")}]`;
	}
	const keys = Object.keys(obj).sort();
	const parts = keys.map(
		(key) =>
			`"${key}":${deterministicStringify((obj as Record<string, unknown>)[key])}`,
	);
	return `{${parts.join(",")}}`;
}

export const debounce = <T extends unknown[], R>(
	fn: (...args: T) => R | Promise<R>,
	wait: number,
): ((...args: T) => Promise<R>) => {
	let timeout: NodeJS.Timeout | null = null;
	let resolves: ((value: R | PromiseLike<R>) => void)[] = [];
	let rejects: ((reason?: unknown) => void)[] = [];

	return (...args: T): Promise<R> => {
		if (timeout) {
			clearTimeout(timeout);
		}

		return new Promise<R>((resolve, reject) => {
			resolves.push(resolve);
			rejects.push(reject);

			timeout = setTimeout(async () => {
				timeout = null;
				try {
					const result = await fn(...args);
					resolves.forEach((r) => {
						r(result);
					});
				} catch (error) {
					rejects.forEach((r) => {
						r(error);
					});
				} finally {
					resolves = [];
					rejects = [];
				}
			}, wait);
		});
	};
};
