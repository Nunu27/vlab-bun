import type Dockerode from "dockerode";
import type { Container } from "dockerode";

export function getModem(container: Container): Dockerode["modem"] {
	return container.modem;
}

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

export function removeItemFromArray<T>(arr: T[], item: T) {
	const index = arr.indexOf(item);
	removeItemFromArrayByIndex(arr, index);
}

export function removeItemFromArrayByIndex<T>(arr: T[], index: number) {
	const lastItem = arr.at(-1);
	if (index < 0 || index >= arr.length || !lastItem) return;

	arr[index] = lastItem;
	arr.pop();
}
