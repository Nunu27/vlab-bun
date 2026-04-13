import db from "@api/db";
import { destroyLab } from "@api/services/clab";
import { clabMonitor } from "@api/services/events";
import baseLogger from "@api/services/logger";
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
			columns: { id: true },
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
		for (const { id } of expiredSessions) {
			try {
				logger.debug({ sessionId: id }, "Destroying expired session");
				await destroyLab(id);
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

clabMonitor.emitter.on("session-create", () => {
	staleSessionCleanUpJob.resume();
});
