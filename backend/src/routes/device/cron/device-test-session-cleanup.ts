import db from "@backend/db";
import { deviceTestSessions } from "@backend/db/schema/lab-device";
import clab, { clabWrapper } from "@backend/services/clab";
import logger from "@backend/services/logger";
import { releasePorts } from "@backend/services/port-manager";
import { chunk } from "@backend/utils/chunk";
import cron, { Patterns } from "@elysiajs/cron";
import { inArray } from "drizzle-orm";
import cluster from "node:cluster";

async function destroyTestSession(id: string): Promise<void> {
	await clabWrapper(() =>
		clab.DELETE("/api/v1/labs/{labName}", {
			params: {
				path: {
					labName: `device-${id}`
				},
				query: {
					cleanup: true
				}
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

		await db.transaction(async (tx) => {
			const sessions = await tx.query.deviceTestSessions.findMany({
				columns: { id: true, leasedPorts: true },
				where: (deviceTestSessions, { lte }) => {
					return lte(deviceTestSessions.createdAt, cutoff);
				}
			});

			if (!sessions.length) return;

			const sessionChunks = chunk(sessions, 10);
			const sessionsToDelete: string[] = [];
			const portsToRelease: number[] = [];

			for (const sessionChunk of sessionChunks) {
				const results = await Promise.allSettled(
					sessionChunk.map(({ id }) => destroyTestSession(id))
				);

				// Collect IDs of successfully destroyed sessions
				for (let i = 0; i < results.length; i++) {
					const result = results[i];
					if (result.status === "fulfilled") {
						sessionsToDelete.push(sessionChunk[i].id);
						portsToRelease.push(...sessionChunk[i].leasedPorts);
					}
				}
			}

			// Delete destroyed sessions
			if (sessionsToDelete.length > 0) {
				await tx
					.delete(deviceTestSessions)
					.where(inArray(deviceTestSessions.id, sessionsToDelete));
				await releasePorts(portsToRelease);
			}
		});
	},
	pattern: Patterns.everyMinutes(15),
	catch: (error) => {
		logger.error({ error }, "Device test session cleanup task failed");
	}
});
