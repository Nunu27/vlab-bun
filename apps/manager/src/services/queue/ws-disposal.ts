import baseLogger from "@manager/lib/logger";
import redis from "@manager/lib/redis";
import { Queue, Worker } from "bullmq";
import type { WaycastDisposalScheduler } from "waycast";

const logger = baseLogger.child({ service: "queue-ws-disposal" });

export interface WsDisposalJob {
	key: string;
}

const queue = new Queue<WsDisposalJob, void, "dispose">("ws-disposal", {
	connection: redis.client,
});

let dueHandler: ((key: string) => void) | undefined;

export const wsDisposalWorker = new Worker<WsDisposalJob, void, "dispose">(
	"ws-disposal",
	async ({ id, data }) => {
		logger.info({ id }, "Executing ws disposal job");
		dueHandler?.(data.key);
	},
	{ connection: redis.client },
);

wsDisposalWorker.on("failed", (job, err) => {
	logger.error({ err, jobId: job?.id }, "Ws disposal job failed");
});

export const wsDisposalScheduler: WaycastDisposalScheduler = {
	async schedule(key, delayMs) {
		await (await queue.getJob(key))?.remove();
		await queue.add(
			"dispose",
			{ key },
			{ jobId: key, delay: delayMs, removeOnComplete: true },
		);
	},
	async cancel(key) {
		const job = await queue.getJob(key);
		await job?.remove();
	},
	onDue(handler) {
		dueHandler = handler;
	},
};
