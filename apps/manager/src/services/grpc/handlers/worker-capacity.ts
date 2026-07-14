import db from "@manager/db";
import { workers } from "@manager/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";

export const DEFAULT_CPU_COST_CORES = 0.5;
export const DEFAULT_MEMORY_COST_MB = 512;

async function tryGetAvailableWorkerId(
	cpuCostCores: number,
	memoryCostMB: number,
): Promise<string | null> {
	return await db.transaction(async (tx) => {
		const [selected] = await tx
			.select({ id: workers.id })
			.from(workers)
			.where(
				and(
					eq(workers.status, "online"),
					sql`(1 - ${workers.cpuUsagePercent} / 100.0) * ${workers.cpuCores} >= ${cpuCostCores}`,
					sql`(1 - ${workers.memoryUsagePercent} / 100.0) * ${workers.memoryMB} >= ${memoryCostMB}`,
					sql`${workers.deployingLab} < ${workers.cpuCores}`,
				),
			)
			.orderBy(asc(workers.activeLabs))
			.limit(1)
			.for("update", { skipLocked: true });

		if (!selected) {
			return null;
		}

		await tx
			.update(workers)
			.set({
				activeLabs: sql`${workers.activeLabs} + 1`,
				deployingLab: sql`${workers.deployingLab} + 1`,
			})
			.where(eq(workers.id, selected.id));

		return selected.id;
	});
}

export type WaitForWorkerOptions = {
	timeoutMs?: number;
	initialDelayMs?: number;
	maxDelayMs?: number;
	backoffFactor?: number;
	onWait?: (attempt: number, delayMs: number) => void;
	signal?: AbortSignal;
};

function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
	if (signal?.aborted) return Promise.reject(signal.reason);

	return new Promise((resolve, reject) => {
		const onAbort = () => {
			clearTimeout(timer);
			reject(signal?.reason);
		};
		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		signal?.addEventListener("abort", onAbort, { once: true });
	});
}

export async function waitForAvailableWorkerId(
	cpuCostCores = DEFAULT_CPU_COST_CORES,
	memoryCostMB = DEFAULT_MEMORY_COST_MB,
	options?: WaitForWorkerOptions,
): Promise<string> {
	const timeoutMs = options?.timeoutMs ?? 30_000;
	const initialDelayMs = options?.initialDelayMs ?? 500;
	const maxDelayMs = options?.maxDelayMs ?? 5_000;
	const backoffFactor = options?.backoffFactor ?? 1.5;
	const signal = options?.signal;

	const startTime = Date.now();
	let currentDelayMs = initialDelayMs;
	let attempt = 1;

	while (Date.now() - startTime < timeoutMs) {
		signal?.throwIfAborted();

		const workerId = await tryGetAvailableWorkerId(cpuCostCores, memoryCostMB);
		if (workerId) return workerId;

		options?.onWait?.(attempt, currentDelayMs);

		await abortableDelay(currentDelayMs, signal);

		currentDelayMs = Math.min(currentDelayMs * backoffFactor, maxDelayMs);
		attempt++;
	}

	throw new Error(
		`No worker nodes available after ${Math.round(timeoutMs / 1000)}s of retrying. All workers are offline or at capacity, please try again shortly.`,
	);
}
