import baseLogger from "@manager/lib/logger";
import redis from "@manager/lib/redis";
import { submitActiveSession } from "@manager/services/grpc/handlers/monitor";
import { workerActions } from "@manager/services/worker-actions";
import { Queue, Worker } from "bullmq";

const logger = baseLogger.child({ service: "queue-lab-session" });

export type LabSessionCleanupJob = {
	sessionId: string;
	workerId: string;
};

export const labSessionQueue = new Queue<LabSessionCleanupJob, void, "cleanup">(
	"lab-session",
	{ connection: redis.client },
);

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

		const received = await workerActions.dispatch(
			"lab:submitSession",
			workerId,
			{
				sessionId,
			},
		);

		if (received === 0) {
			logger.warn(
				{ sessionId, workerId },
				"Worker is offline across all managers, forcing session submission immediately",
			);
			await submitActiveSession(sessionId);
		}
	},
	{ connection: redis.client },
);

labSessionWorker.on("failed", (job, err) => {
	logger.error(
		{ err, jobId: job?.id, sessionId: job?.data?.sessionId },
		"Lab session teardown job failed",
	);
});
