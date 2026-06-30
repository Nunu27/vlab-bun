import db from "@manager/db";
import { labSessions, workers } from "@manager/db/schema";
import { sendCommandToWorker } from "@manager/services/grpc";
import ws from "@manager/services/ws";
import type { LabLink, LabNode } from "@manager/types/clab";
import { getAffectedCount } from "@manager/utils/db";
import { eq, sql } from "drizzle-orm";

export async function handleInitLabSession(
	workerId: string,
	payload: {
		requestId: string;
		sessionId: string;
		labId: string;
		userId: string;
		nodes: LabNode[];
		links: LabLink[];
		dueDate: number;
	},
) {
	const { requestId, sessionId, labId, userId, nodes, links, dueDate } =
		payload;

	try {
		await sendCommandToWorker(workerId, "clab:deployLab", {
			sessionId,
			config: {
				labId,
				ownerId: userId,
				nodes,
				links,
				dueDate,
			},
		});
	} catch (error) {
		const shouldDecrement = await getAffectedCount(
			db.delete(labSessions).where(eq(labSessions.id, sessionId)),
		);

		if (shouldDecrement) {
			await db
				.update(workers)
				.set({ activeLabs: sql`GREATEST(${workers.activeLabs} - 1, 0)` })
				.where(eq(workers.id, workerId));
		}

		ws.server.replyError(
			"lab:[id]:init",
			requestId,
			error instanceof Error ? error.message : String(error),
		);
		return;
	}

	ws.server.reply("lab:[id]:init", requestId)(
		"info",
		"Lab provisioned successfully.",
	);
	ws.server.replyResponse("lab:[id]:init", requestId, sessionId);
}

export async function handleSubmitLabSession(
	workerId: string,
	payload: {
		sessionId: string;
	},
) {
	await sendCommandToWorker(workerId, "clab:destroyLab", {
		sessionId: payload.sessionId,
	});
}
