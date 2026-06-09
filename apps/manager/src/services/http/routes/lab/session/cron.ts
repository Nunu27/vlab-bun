import db from "@manager/db";
import baseLogger from "@manager/lib/logger";
import { sendCommandToWorker } from "@manager/services/grpc";
import { Cron } from "croner";

const logger = baseLogger.child({ service: "lab-session-cron" });

export const staleSessionCleanUpJob = new Cron(
	"* * * * *",
	{
		catch: (error) =>
			logger.error({ error }, "Error in stale session cron job"),
	},
	async (cron) => {
		const now = new Date();

		const expiredSessions = await db.query.labSessions.findMany({
			columns: { id: true, workerId: true },
			where: (session, { and, isNull, lte }) => {
				return and(isNull(session.submittedAt), lte(session.dueDate, now));
			},
		});

		if (!expiredSessions.length) return;

		logger.info(
			"Found %d expired lab sessions, initiating teardown...",
			expiredSessions.length,
		);

		let destroyed = 0;
		for (const { id, workerId } of expiredSessions) {
			try {
				logger.debug({ sessionId: id }, "Destroying expired session");
				sendCommandToWorker(workerId, "clab:destroyLab", { sessionId: id });
				destroyed++;
			} catch (error) {
				logger.error(
					{ error, sessionId: id },
					"Failed to destroy expired session",
				);
			}
		}

		if (destroyed === expiredSessions.length) {
			cron.pause();
		}
	},
);

// Cron job needs to be resumed when new sessions are created.
// This is now handled directly by the event emitter or skipped if running every minute.
