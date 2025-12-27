import db from "@backend/db";
import clab, { clabWrapper } from "@backend/services/clab";
import logger from "@backend/services/logger";
import cron, { Patterns } from "@elysiajs/cron";
import { chunk } from "@vlab/shared/utils";
import cluster from "node:cluster";

async function destroySession(id: string): Promise<void> {
	await clabWrapper(() =>
		clab.DELETE("/api/v1/labs/{labName}", {
			params: {
				path: {
					labName: id.replace(/-/g, "")
				},
				query: { cleanup: true }
			}
		})
	);
}

export default cron({
	name: "lab-session-cleanup",
	paused: cluster.isWorker,
	run: async () => {
		const cutoff = new Date();
		cutoff.setHours(cutoff.getHours() - 3);

		const sessions = await db.query.labSessions.findMany({
			columns: { id: true },
			where: (labSessions, { lte, eq, and }) => {
				return and(
					eq(labSessions.type, "user"),
					lte(labSessions.createdAt, cutoff)
				);
			}
		});
		if (!sessions.length) return;

		logger.info("Found %d lab sessions to cleanup", sessions.length);

		const sessionChunks = chunk(sessions, 10);
		let deletedSessions = 0;

		for (const sessionChunk of sessionChunks) {
			const results = await Promise.allSettled(
				sessionChunk.map(({ id }) => destroySession(id))
			);

			const successfulDeletions = results.filter(
				(r) => r.status === "fulfilled"
			).length;
			deletedSessions += successfulDeletions;
		}

		logger.info("Cleaned up %d lab sessions", deletedSessions);
	},
	pattern: Patterns.everyMinutes(30),
	catch: (error) => {
		logger.error({ error }, "lab session cleanup task failed");
	}
});
