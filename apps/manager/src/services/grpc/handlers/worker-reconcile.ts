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
import { and, eq } from "drizzle-orm";
import { sendCommandToWorker } from "./worker-registry";

const logger = baseLogger.child({ service: "worker-grpc" });

export async function resetStaleWorkers() {
	await db
		.update(workers)
		.set({ status: "offline" })
		.where(
			and(eq(workers.managerId, env.MANAGER_ID), eq(workers.status, "online")),
		);
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
