import env from "@manager/env";
import baseLogger from "@manager/lib/logger";
import { storageCleanup } from "@manager/lib/storage";
import { Queue, Worker } from "bullmq";

const logger = baseLogger.child({ service: "queue-storage-cleanup" });

const redisUrl = new URL(env.REDIS_URL);
const bullmqConnection = {
	host: redisUrl.hostname,
	port: Number(redisUrl.port) || 6379,
	password: redisUrl.password || undefined,
	db: Number(redisUrl.pathname.replace("/", "")) || 0,
	maxRetriesPerRequest: null,
};

export const storageCleanupQueue = new Queue<void, void, "cleanup">(
	"storage-cleanup",
	{
		connection: bullmqConnection,
	},
);

export const storageCleanupWorker = new Worker<void, void, "cleanup">(
	"storage-cleanup",
	async () => {
		logger.info("Executing storage cleanup job");
		await storageCleanup();
	},
	{
		connection: bullmqConnection,
	},
);

storageCleanupWorker.on("failed", (job, err) => {
	logger.error({ err, jobId: job?.id }, "Storage cleanup job failed");
});
