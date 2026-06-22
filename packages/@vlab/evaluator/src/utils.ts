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

// Leading + trailing throttle: fires immediately on first call, then once more
// at the end of the window if additional calls arrived during the wait period.
export const throttle = <T extends unknown[], R>(
	fn: (...args: T) => R | Promise<R>,
	wait: number,
): ((...args: T) => Promise<R>) => {
	let timeout: NodeJS.Timeout | null = null;
	let pendingArgs: T | null = null;
	let pendingResolves: ((value: R | PromiseLike<R>) => void)[] = [];
	let pendingRejects: ((reason?: unknown) => void)[] = [];

	const execute = async (args: T) => {
		const resolves = pendingResolves;
		const rejects = pendingRejects;
		pendingArgs = null;
		pendingResolves = [];
		pendingRejects = [];

		timeout = setTimeout(() => {
			timeout = null;
			if (pendingArgs !== null) {
				execute(pendingArgs);
			}
		}, wait);

		try {
			const result = await fn(...args);
			resolves.forEach((r) => {
				r(result);
			});
		} catch (error) {
			rejects.forEach((r) => {
				r(error);
			});
		}
	};

	return (...args: T): Promise<R> => {
		return new Promise<R>((resolve, reject) => {
			pendingResolves.push(resolve);
			pendingRejects.push(reject);
			if (timeout === null) {
				execute(args);
			} else {
				pendingArgs = args;
			}
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
