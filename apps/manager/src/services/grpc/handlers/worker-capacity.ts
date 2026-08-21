import db from "@manager/db";
import { workers } from "@manager/db/schema";
import env from "@manager/env";
import {
	DEFAULT_CPU_COST_CORES,
	DEFAULT_MEMORY_COST_MB,
} from "@vlab/shared/resource-cost";
import { and, asc, eq, sql } from "drizzle-orm";
import { capacityEvents } from "./worker-capacity-events";

export { DEFAULT_CPU_COST_CORES, DEFAULT_MEMORY_COST_MB };

/**
 * Whether a worker could *ever* host a lab of this size, ignoring current usage.
 * Used to fail an impossible request immediately rather than timing out.
 */
function fitsAtAll(cpuCostCores: number, memoryCostMB: number) {
	return and(
		sql`${workers.memoryMB} >= ${memoryCostMB}`,
		sql`${workers.cpuCores} >= ${cpuCostCores}`,
	);
}

/**
 * Whether a worker has enough available capacity right now.
 */
function hasRoomNow(cpuCostCores: number, memoryCostMB: number) {
	return and(
		eq(workers.status, "online"),
		fitsAtAll(cpuCostCores, memoryCostMB),
		sql`(1 - ${workers.cpuUsagePercent} / 100.0) * ${workers.cpuCores} >= ${cpuCostCores}`,
		sql`(1 - ${workers.memoryUsagePercent} / 100.0) * ${workers.memoryMB} >= ${memoryCostMB}`,
		sql`${workers.deployingLab} < LEAST(${workers.cpuCores}, ${env.CAPACITY_MAX_CONCURRENT_DEPLOYS})`,
	);
}

async function tryGetAvailableWorkerId(
	cpuCostCores: number,
	memoryCostMB: number,
): Promise<string | null> {
	return await db.transaction(async (tx) => {
		const [selected] = await tx
			.select({ id: workers.id })
			.from(workers)
			.where(hasRoomNow(cpuCostCores, memoryCostMB))
			.orderBy(asc(workers.activeLabs), asc(workers.id))
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

/**
 * Counts, per fleet, what could serve a request of this size. The `::int` casts
 * matter: Postgres returns count/sum as bigint, which the driver hands back as a
 * string, and "0" is truthy.
 */
async function summarizeFleet(cpuCostCores: number, memoryCostMB: number) {
	const [summary] = await db
		.select({
			total: sql<number>`count(*)::int`,
			online: sql<number>`(count(*) filter (where ${workers.status} = 'online'))::int`,
			couldEverFit: sql<number>`(count(*) filter (where ${fitsAtAll(cpuCostCores, memoryCostMB)}))::int`,
			activeLabs: sql<number>`coalesce(sum(${workers.activeLabs}) filter (where ${workers.status} = 'online'), 0)::int`,
		})
		.from(workers);

	return summary ?? { total: 0, online: 0, couldEverFit: 0, activeLabs: 0 };
}

/** Explains why nothing could be admitted, for the error a student sees. */
function describeShortfall(
	summary: Awaited<ReturnType<typeof summarizeFleet>>,
	memoryCostMB: number,
) {
	if (!summary.total) {
		return "No worker nodes are registered. Please contact your instructor.";
	}

	if (!summary.couldEverFit) {
		return `This lab needs ${memoryCostMB} MB of memory, which is more than any worker node can provide. Please contact your instructor.`;
	}

	if (!summary.online) {
		return "No worker nodes are online. Please contact your instructor.";
	}

	return `All worker nodes are at capacity (${summary.activeLabs} labs running). Please try again shortly.`;
}

export type WaitForWorkerOptions = {
	timeoutMs?: number;
	onWait?: (attempt: number) => void;
	signal?: AbortSignal;
};

/** Spreads a woken crowd so they don't all contend for the same row at once. */
function settleDelay(): number {
	return Math.random() * 250;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
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

/**
 * Resolves true if `notified` fires within `ms`, false on timeout. Both the
 * timer and the abort listener are torn down whichever way it settles, so a
 * wake-up does not leave a timer running that would later reject unobserved.
 */
function waitForNotice(
	notified: Promise<void>,
	ms: number,
	signal?: AbortSignal,
): Promise<boolean> {
	if (signal?.aborted) return Promise.reject(signal.reason);

	return new Promise((resolve, reject) => {
		const cleanup = () => {
			clearTimeout(timer);
			signal?.removeEventListener("abort", onAbort);
		};
		const onAbort = () => {
			cleanup();
			reject(signal?.reason);
		};
		const timer = setTimeout(() => {
			cleanup();
			resolve(false);
		}, ms);

		signal?.addEventListener("abort", onAbort, { once: true });
		notified.then(() => {
			cleanup();
			resolve(true);
		});
	});
}

/**
 * Wait for an available worker, using event-driven wakeup via capacityEvents
 * whenever any worker frees up capacity (early awake).
 */
export async function waitForAvailableWorkerId(
	cpuCostCores = DEFAULT_CPU_COST_CORES,
	memoryCostMB = DEFAULT_MEMORY_COST_MB,
	options?: WaitForWorkerOptions,
): Promise<string> {
	const timeoutMs = options?.timeoutMs ?? env.CAPACITY_WAIT_TIMEOUT_MS;
	const signal = options?.signal;
	const deadline = Date.now() + timeoutMs;

	// Fail fast if lab can never fit any worker in the fleet.
	const fleet = await summarizeFleet(cpuCostCores, memoryCostMB);
	if (!fleet.total || !fleet.couldEverFit) {
		throw new Error(describeShortfall(fleet, memoryCostMB));
	}

	let notifyFreed: (() => void) | undefined;
	const onFreed = () => notifyFreed?.();

	capacityEvents.on("freed", onFreed);

	try {
		let attempt = 1;

		while (true) {
			signal?.throwIfAborted();

			const freed = new Promise<void>((resolve) => {
				notifyFreed = resolve;
			});

			const workerId = await tryGetAvailableWorkerId(
				cpuCostCores,
				memoryCostMB,
			);
			if (workerId) return workerId;

			const remainingMs = deadline - Date.now();
			if (remainingMs <= 0) break;

			options?.onWait?.(attempt);
			attempt++;

			const woke = await waitForNotice(freed, remainingMs, signal);
			if (!woke) break;

			await delay(settleDelay(), signal);
		}
	} finally {
		capacityEvents.off("freed", onFreed);
	}

	throw new Error(
		describeShortfall(
			await summarizeFleet(cpuCostCores, memoryCostMB),
			memoryCostMB,
		),
	);
}
