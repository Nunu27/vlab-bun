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

		await db.transaction(async (tx) => {
			const sessions = await tx.query.labSessions.findMany({
				columns: { id: true, ports: true },
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
			const sessionsToDelete: string[] = [];

			for (const sessionChunk of sessionChunks) {
				const results = await Promise.allSettled(
					sessionChunk.map(({ id }) => destroySession(id))
				);

				// Collect IDs of successfully destroyed sessions
				for (let i = 0; i < results.length; i++) {
					const result = results[i];
					if (result.status === "fulfilled") {
						sessionsToDelete.push(sessionChunk[i].id);
					}
				}
			}

			logger.info("Cleaned up %d lab sessions", sessionsToDelete.length);
		});
	},
	pattern: Patterns.everyMinutes(15),
	catch: (error) => {
		logger.error({ error }, "lab session cleanup task failed");
	}
});
