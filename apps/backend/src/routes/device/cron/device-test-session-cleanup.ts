import db from "@backend/db";
import clab, { clabWrapper } from "@backend/services/clab";
import logger from "@backend/services/logger";
import cron, { Patterns } from "@elysiajs/cron";
import { chunk } from "@vlab/shared/utils";
import cluster from "cluster";

async function destroyTestSession(id: string): Promise<void> {
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
	name: "device-test-session-cleanup",
	paused: cluster.isWorker,
	run: async () => {
		const cutoff = new Date();
		cutoff.setMinutes(cutoff.getMinutes() - 5);

		const sessions = await db.query.labSessions.findMany({
			columns: { id: true },
			where: (labSessions, { lte, eq, and }) => {
				return and(
					eq(labSessions.type, "device-test"),
					lte(labSessions.createdAt, cutoff)
				);
			}
		});

		if (!sessions.length) return;

		logger.info("Found %d device test sessions to cleanup", sessions.length);

		const sessionChunks = chunk(sessions, 10);
		let deletedSessions = 0;

		for (const sessionChunk of sessionChunks) {
			const results = await Promise.allSettled(
				sessionChunk.map(({ id }) => destroyTestSession(id))
			);

			const successfulDeletions = results.filter(
				(r) => r.status === "fulfilled"
			).length;
			deletedSessions += successfulDeletions;
		}

		logger.info("Cleaned up %d device test sessions", deletedSessions);
	},
	pattern: Patterns.everyMinutes(15),
	catch: (error) => {
		logger.error({ error }, "Device test session cleanup task failed");
	}
});
