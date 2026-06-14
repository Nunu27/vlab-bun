import baseLogger from "@manager/lib/logger";
import redis from "@manager/lib/redis";
import ws from "@manager/services/ws";
import { Queue, Worker } from "bullmq";

const logger = baseLogger.child({ service: "queue-ws-disposal" });

export interface WsDisposalJob {
	connectionId: string;
	topic: string;
}

export const wsDisposalQueue = new Queue<WsDisposalJob, void, "dispose">(
	"ws-disposal",
	{ connection: redis.client },
);

export const wsDisposalWorker = new Worker<WsDisposalJob, void, "dispose">(
	"ws-disposal",
	async ({ id, data }) => {
		logger.info({ id }, "Executing ws disposal job");
		await ws.server.executeDispose(data.connectionId, data.topic);
	},
	{ connection: redis.client },
);

wsDisposalWorker.on("failed", (job, err) => {
	logger.error({ err, jobId: job?.id }, "Ws disposal job failed");
});
