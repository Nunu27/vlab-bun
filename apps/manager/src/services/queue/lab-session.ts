import redis from "@manager/lib/redis";
import { Queue } from "bullmq";

export type LabSessionCleanupJob = {
	sessionId: string;
	workerId: string;
};

export const labSessionQueue = new Queue<LabSessionCleanupJob, void, "cleanup">(
	"lab-session",
	{ connection: redis.client },
);
