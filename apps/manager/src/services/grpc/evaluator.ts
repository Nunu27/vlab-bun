import db from "@manager/db";
import { labSessions, labs } from "@manager/db/schema";
import { sendCommandToWorker } from "@manager/services/grpc";
import { eq } from "drizzle-orm";

export async function startLabEvaluation(sessionId: string, labId: string) {
	const session = await db.query.labSessions.findFirst({
		where: eq(labSessions.id, sessionId),
		columns: { workerId: true },
	});
	if (!session?.workerId) return;

	const lab = await db.query.labs.findFirst({
		where: eq(labs.id, labId),
		columns: { checks: true, topology: true },
	});
	if (!lab) return;

	const sessionChecks = Object.entries(lab.checks).map(
		([id, check]: [string, any]) => ({
			id,
			type: check.type,
			target: check.target,
			condition: check.condition,
			// Omit description and weight since evaluator doesn't need it
		}),
	);

	const nodeMap = Object.entries(lab.topology.devices).reduce(
		(acc: any, [id, device]: [string, any]) => {
			acc[id] = { name: device.name, kind: device.kind };
			return acc;
		},
		{},
	);

	const values: Record<string, boolean> = {};

	sendCommandToWorker(session.workerId, "evaluator:start", {
		sessionId,
		nodeMap,
		sessionChecks,
		values,
	});
}

export async function stopLabEvaluation(sessionId: string) {
	const session = await db.query.labSessions.findFirst({
		where: eq(labSessions.id, sessionId),
		columns: { workerId: true },
	});
	if (!session?.workerId) return;

	sendCommandToWorker(session.workerId, "evaluator:stop", {
		sessionId,
		immediate: true,
	});
}
