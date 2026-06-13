import db from "@manager/db";
import { labSessionChecks, labSessionNodes, labs } from "@manager/db/schema";
import { sendCommandToWorker } from "@manager/services/grpc";
import ws from "@manager/services/ws";
import type { NodeInfo } from "@vlab/evaluator/types";
import { eq } from "drizzle-orm";

export async function handleStartLabEvaluation(
	workerId: string,
	payload: {
		sessionId: string;
		labId: string;
	},
) {
	const { sessionId, labId } = payload;
	const lab = await db.query.labs.findFirst({
		where: eq(labs.id, labId),
		columns: { checks: true },
	});
	if (!lab) return;

	const nodes = await db.query.labSessionNodes.findMany({
		columns: { id: true, ip: true, containerId: true, labNodeId: true },
		where: eq(labSessionNodes.labSessionId, sessionId),
	});

	const checks = await db.query.labSessionChecks.findMany({
		columns: { checkId: true, completed: true },
		where: eq(labSessionChecks.labSessionId, sessionId),
	});

	const values = checks.reduce<Record<string, boolean>>((acc, check) => {
		acc[check.checkId] = check.completed;
		return acc;
	}, {});

	const nodeMap: Record<string, NodeInfo> = {};
	const nodeIdMap: Record<string, string> = {};

	nodes.forEach((n) => {
		nodeIdMap[n.labNodeId] = n.id;
		nodeMap[n.id] = n;
	});

	const sessionChecks = Object.entries(lab.checks).map(([id, check]) => ({
		id,
		nodeId: nodeIdMap[check.nodeId] || check.nodeId,
		checkId: check.checkId,
		params: check.params,
	}));

	await sendCommandToWorker(
		workerId,
		"evaluator:start",
		{
			sessionId,
			nodeMap,
			sessionChecks,
			values,
		},
		{
			checkChanged: async ({ id, completed }) => {
				await db
					.insert(labSessionChecks)
					.values({
						labSessionId: sessionId,
						checkId: id,
						completed,
					})
					.onConflictDoUpdate({
						target: [labSessionChecks.labSessionId, labSessionChecks.checkId],
						set: {
							completed,
						},
					});

				ws.server.emit(
					"lab-session:[sessionId]:checks",
					{ sessionId },
					{ id, completed },
				);
			},
		},
	);
}

export async function handleStopLabEvaluation(
	workerId: string,
	payload: {
		sessionId: string;
	},
) {
	await sendCommandToWorker(workerId, "evaluator:stop", {
		sessionId: payload.sessionId,
	});
}
