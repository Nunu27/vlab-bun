import baseLogger from "@manager/lib/logger";
import redis from "@manager/lib/redis";
import { storageCleanup } from "@manager/lib/storage";
import { Queue, Worker } from "bullmq";

const logger = baseLogger.child({ service: "queue-storage-cleanup" });

export const storageCleanupQueue = new Queue<void, void, "cleanup">(
	"storage-cleanup",
	{ connection: redis.client },
);

export const storageCleanupWorker = new Worker<void, void, "cleanup">(
	"storage-cleanup",
	async () => {
		logger.info("Executing storage cleanup job");
		await storageCleanup();
	},
	{ connection: redis.client },
);

storageCleanupWorker.on("failed", (job, err) => {
	logger.error({ err, jobId: job?.id }, "Storage cleanup job failed");
});
