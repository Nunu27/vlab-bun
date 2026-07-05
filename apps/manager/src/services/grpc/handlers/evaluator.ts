import db from "@manager/db";
import { labSessionChecks } from "@manager/db/schema";
import baseLogger from "@manager/lib/logger";
import ws from "@manager/services/ws";
import type { appRouter } from "@vlab/grpc";

const logger = baseLogger.child({ service: "evaluator-grpc" });

export function attachEvaluatorHandlers(
	workerId: string,
	client: ReturnType<typeof appRouter.buildClient>,
) {
	client.onData("evaluator:checkChanged", {
		callback: async ({ sessionId, id, completed }) => {
			try {
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

				ws.server.emit("lab-session:[sessionId]:checks", {
					params: { sessionId },
					data: { id, completed },
				});
			} catch (err) {
				logger.error(
					{ err, sessionId, checkId: id, workerId },
					"Failed to process checkChanged event",
				);
			}
		},
	});
}
