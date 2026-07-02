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

export interface RetryOptions {
	/** Max attempts, including the first. */
	retries?: number;
	minDelayMs?: number;
	maxDelayMs?: number;
	factor?: number;
	signal?: AbortSignal;
	onAttemptFailed?: (error: unknown, attempt: number) => void;
}

function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
	if (signal?.aborted) return Promise.reject(new Error("Aborted"));
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		const onAbort = () => {
			clearTimeout(timer);
			reject(new Error("Aborted"));
		};
		signal?.addEventListener("abort", onAbort, { once: true });
	});
}

/**
 * Retries `fn` with exponential backoff + jitter. Used to ride out transient
 * failures (e.g. a container/device not being ready yet) at the moment a
 * failure is observed, not on a schedule.
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	options: RetryOptions = {},
): Promise<T> {
	const {
		retries = 5,
		minDelayMs = 500,
		maxDelayMs = 15_000,
		factor = 2,
		signal,
		onAttemptFailed,
	} = options;

	let attempt = 0;
	let delay = minDelayMs;

	while (true) {
		if (signal?.aborted) throw new Error("Aborted");
		try {
			return await fn();
		} catch (error) {
			attempt++;
			onAttemptFailed?.(error, attempt);
			if (attempt >= retries) throw error;

			const jittered = delay * (0.5 + Math.random());
			await abortableSleep(Math.min(jittered, maxDelayMs), signal);
			delay = Math.min(delay * factor, maxDelayMs);
		}
	}
}

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
