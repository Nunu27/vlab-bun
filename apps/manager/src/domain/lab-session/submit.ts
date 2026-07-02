import db from "@manager/db";
import { labSessionNodes, labSessions, workers } from "@manager/db/schema";
import baseLogger from "@manager/lib/logger";
import { dispatchWorkerAction } from "@manager/services/grpc";
import { cache } from "@manager/services/http/middlewares/caching";
import ws from "@manager/services/ws";
import { eq, sql } from "drizzle-orm";

const logger = baseLogger.child({ service: "lab-session" });

async function completeSession(sessionId: string, workerId: string) {
	const now = new Date();
	const session = await db.transaction(async (tx) => {
		const session = await tx.query.labSessions.findFirst({
			columns: { id: true, labId: true, studentId: true },
			where: (labSessions, { eq, and, isNull }) =>
				and(eq(labSessions.id, sessionId), isNull(labSessions.submittedAt)),
			with: {
				lab: { columns: { checks: true } },
				checks: { columns: { checkId: true, completed: true } },
			},
		});
		if (!session) return null;

		const passed = new Set<string>();
		session.checks.forEach((check) => {
			if (check.completed) passed.add(check.checkId);
		});

		const checksObj = session.lab.checks;
		const totalWeight = Object.values(checksObj).reduce(
			(acc: number, check) => acc + check.weight,
			0,
		);
		let completedWeight = 0;
		passed.forEach((checkId) => {
			completedWeight += checksObj[checkId]?.weight ?? 0;
		});

		const scoreStr = Math.round(
			(completedWeight / totalWeight) * 100,
		).toString();

		await tx
			.update(labSessions)
			.set({
				score: scoreStr,
				submittedAt: now,
			})
			.where(eq(labSessions.id, sessionId));
		const deletedNodes = await tx
			.delete(labSessionNodes)
			.where(eq(labSessionNodes.labSessionId, sessionId))
			.returning({ id: labSessionNodes.id });
		await tx
			.update(workers)
			.set({
				activeLabs: sql`GREATEST(${workers.activeLabs} - 1, 0)`,
				activeNodes: sql`GREATEST(${workers.activeNodes} - ${deletedNodes.length}, 0)`,
			})
			.where(eq(workers.id, workerId));
		return { ...session, score: scoreStr };
	});
	if (!session) return;

	await cache.delete(
		`lab:${session.labId}:lab-session:${session.id}`,
		`lab:${session.labId}:lab-session:list:${session.studentId}`,
	);

	logger.debug({ sessionId }, "Session completed and submitted");
	ws.server.emit("lab-session:[sessionId]:ended", {
		params: { sessionId },
		data: undefined,
	});
	ws.server.emit("lab:[labId]:enrollment:update", {
		params: { labId: session.labId },
		data: {
			id: session.studentId,
			status: "Submitted",
			score: session.score ?? undefined,
			lastUpdated: now,
		},
	});
}

export async function submitSession(sessionId: string, workerId: string) {
	await completeSession(sessionId, workerId);

	const delivered = await dispatchWorkerAction("lab:destroy", workerId, {
		sessionId,
	});
	if (!delivered) {
		logger.warn(
			{ sessionId, workerId },
			"Worker unreachable across the cluster; lab containers were not torn down",
		);
	}
}
