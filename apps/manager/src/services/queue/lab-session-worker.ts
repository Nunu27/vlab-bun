import { submitSession } from "@manager/domain/lab-session/submit";
import baseLogger from "@manager/lib/logger";
import redis from "@manager/lib/redis";
import { Worker } from "bullmq";
import type { LabSessionCleanupJob } from "./lab-session";

const logger = baseLogger.child({ service: "queue-lab-session" });

export const labSessionWorker = new Worker<
	LabSessionCleanupJob,
	void,
	"cleanup"
>(
	"lab-session",
	async (job) => {
		const { sessionId, workerId } = job.data;

		logger.info(
			{ sessionId, workerId },
			"Executing delayed lab session teardown",
		);

		await submitSession(sessionId, workerId);
	},
	{ connection: redis.client },
);

labSessionWorker.on("failed", (job, err) => {
	logger.error(
		{ err, jobId: job?.id, sessionId: job?.data?.sessionId },
		"Lab session teardown job failed",
	);
});
