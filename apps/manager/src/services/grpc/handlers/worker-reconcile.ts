import db from "@manager/db";
import {
	deviceTemplates,
	labSessionNodes,
	labSessions,
	workers,
} from "@manager/db/schema";
import env from "@manager/env";
import baseLogger from "@manager/lib/logger";
import guacamole from "@manager/services/guacamole-lite";
import { and, eq, isNull, sql } from "drizzle-orm";
import { sendCommandToWorker } from "./worker-registry";

const logger = baseLogger.child({ service: "worker-grpc" });

// Matches the worker's METRICS_INTERVAL_MS: one missed heartbeat and it's stale.
export const WORKER_STALE_MS = 10_000;

export function staleCutoff(): Date {
	return new Date(Date.now() - WORKER_STALE_MS);
}

export async function resetStaleWorkers() {
	await db
		.update(workers)
		.set({ status: "offline" })
		.where(
			and(eq(workers.managerId, env.MANAGER_ID), eq(workers.status, "online")),
		);
}

/**
 * Rebuild a worker's capacity counters from the sessions it is actually hosting.
 *
 * The stream teardown zeroes them, but the `lab_session` rows survive and
 * `reconcileWorkerSessions` lets a returning worker keep those labs running. A
 * worker that flapped would otherwise read as completely empty while still
 * holding their memory, and the scheduler would happily fill it up again.
 */
export async function reconcileWorkerCounters(workerId: string) {
	const activeSession = and(
		eq(labSessions.workerId, workerId),
		isNull(labSessions.submittedAt),
	);

	const [[totals], [nodes]] = await Promise.all([
		db
			.select({
				activeLabs: sql<number>`count(*)::int`,
			})
			.from(labSessions)
			.where(activeSession),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(labSessionNodes)
			.innerJoin(labSessions, eq(labSessionNodes.labSessionId, labSessions.id))
			.where(activeSession),
	]);

	await db
		.update(workers)
		.set({
			activeLabs: totals?.activeLabs ?? 0,
			activeNodes: nodes?.count ?? 0,
			// Whatever was mid-deploy died with the previous stream.
			deployingLab: 0,
		})
		.where(eq(workers.id, workerId));

	return totals?.activeLabs ?? 0;
}

// Called right after a worker connects. Used to tear down any left over sessions
export async function reconcileWorkerSessions(workerId: string) {
	const activeSessions = await db.query.labSessions.findMany({
		columns: { id: true },
		where: (labSessions, { eq, and, isNull }) =>
			and(eq(labSessions.workerId, workerId), isNull(labSessions.submittedAt)),
	});

	const destroyed = await sendCommandToWorker(
		workerId,
		"clab:reconcileSessions",
		{
			activeSessionIds: activeSessions.map((s) => s.id),
		},
	);

	if (destroyed.length) {
		logger.warn(
			{ workerId, destroyed },
			"Worker destroyed stale lab sessions not tracked as active by the manager",
		);
	}
}

export async function regenerateWorkerTokens(
	workerId: string,
	guacdHost: string,
	guacdPort: number,
) {
	const nodes = await db
		.select({
			nodeId: labSessionNodes.id,
			ip: labSessionNodes.ip,
			connection: deviceTemplates.connection,
			kind: deviceTemplates.kind,
		})
		.from(labSessionNodes)
		.innerJoin(labSessions, eq(labSessionNodes.labSessionId, labSessions.id))
		.innerJoin(
			deviceTemplates,
			eq(labSessionNodes.deviceTemplateId, deviceTemplates.id),
		)
		.where(eq(labSessions.workerId, workerId));

	if (nodes.length === 0) return;

	await db.transaction(async (tx) => {
		for (const node of nodes) {
			const newToken = guacamole.generateNodeToken(
				node.connection,
				node.kind,
				node.ip,
				guacdHost,
				guacdPort,
			);

			await tx
				.update(labSessionNodes)
				.set({ token: newToken })
				.where(eq(labSessionNodes.id, node.nodeId));
		}
	});

	logger.info(
		{ workerId, nodeCount: nodes.length },
		"Successfully regenerated tokens for worker",
	);
}
