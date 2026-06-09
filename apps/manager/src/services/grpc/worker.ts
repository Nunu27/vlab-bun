import db from "@manager/db";
import { workers } from "@manager/db/schema";
import env from "@manager/env";
import baseLogger from "@manager/lib/logger";
import redis from "@manager/lib/redis";
import { decode, encode } from "@msgpack/msgpack";
import type {
	GrpcDataMessage,
	GrpcRpcReplyMessage,
	GrpcRpcRoutes,
} from "@vlab/grpc";
import { appRouter, WorkerProto } from "@vlab/grpc";

import { eq } from "drizzle-orm";
import type { Static } from "elysia";

const logger = baseLogger.child({ service: "worker-grpc" });

export const connectedWorkers = new Map<
	string,
	ReturnType<typeof appRouter.buildClient>
>();

export async function getAvailableWorkerId(): Promise<string> {
	const onlineWorkers = await db.query.workers.findMany({
		columns: { id: true },
		where: (w, { eq }) => eq(w.status, "online"),
		orderBy: (w, { asc }) => [asc(w.activeLabs), asc(w.activeNodes)],
		limit: 1,
	});
	if (!onlineWorkers.length) throw new Error("No online workers available");
	return onlineWorkers[0].id;
}

export async function sendCommandToWorker<
	K extends Extract<keyof GrpcRpcRoutes, string>,
>(
	workerId: string,
	command: K,
	payload: Static<GrpcRpcRoutes[K]["payload"]>,
): Promise<boolean> {
	const client = connectedWorkers.get(workerId);
	if (client) {
		return new Promise((resolve) => {
			client.rpc(command, {}, payload, {
				response: () => resolve(true),
			});
		});
	}

	// Worker is not on this manager. Forward via Redis.
	const buffer = encode({ command, payload });
	const receivers = await redis.client.publish(
		`vlab:worker-command:${workerId}`,
		Buffer.from(buffer),
	);
	return receivers > 0;
}

export const WorkerServiceImpl: WorkerProto.WorkerServiceImplementation = {
	async *listenCommand(request, context) {
		const workerId = context.metadata.get("worker-id");
		if (typeof workerId !== "string") {
			throw new Error("Missing worker-id metadata");
		}

		// 1. Wait for initial worker spec message
		const iterator = request[Symbol.asyncIterator]();
		const first = await iterator.next();
		if (first.done || !first.value.workerSpec) {
			throw new Error("Worker stream did not provide workerSpec handshake");
		}

		const workerSpec = first.value.workerSpec;

		// 2. Upsert worker into DB
		await db
			.insert(workers)
			.values({
				id: workerId,
				status: "online",
				managerId: env.MANAGER_ID,
				lastSeen: new Date(),
				cpuCores: workerSpec.cpuCores,
				memoryMB: workerSpec.memoryMb,
				storageMB: workerSpec.storageMb,
				cpuUsagePercent: "0",
				memoryUsagePercent: "0",
				storageUsagePercent: "0",
				score: "0",
			})
			.onConflictDoUpdate({
				target: workers.id,
				set: {
					status: "online",
					managerId: env.MANAGER_ID,
					lastSeen: new Date(),
					cpuCores: workerSpec.cpuCores,
					memoryMB: workerSpec.memoryMb,
					storageMB: workerSpec.storageMb,
				},
			});

		logger.info(`Worker ${workerId} connected`);

		// 3. Create Waycast client for this worker
		const msgQueue: WorkerProto.CommandRequest[] = [];
		let msgResolver: (() => void) | null = null;

		const client = appRouter.buildClient({
			send: async (message) => {
				msgQueue.push(
					WorkerProto.CommandRequest.create({
						waycastMessage: Buffer.from(encode(message)),
					}),
				);
				if (msgResolver) msgResolver();
			},
		});
		connectedWorkers.set(workerId, client);

		// 4. Subscribe to Redis for manager-to-manager routing
		const redisSubscriber = redis.client.duplicate();
		const topic = `vlab:worker-command:${workerId}`;
		await redisSubscriber.subscribe(topic);
		redisSubscriber.on("messageBuffer", (channel, messageBuffer) => {
			if (channel.toString() !== topic) return;
			try {
				const decoded = decode(messageBuffer) as {
					command: string;
					payload: unknown;
				};
				client.rpc(
					decoded.command as never,
					undefined as never,
					decoded.payload as never,
					{},
				);
			} catch (err) {
				logger.error(`Failed to decode Redis command: ${err}`);
			}
		});

		const unsubscribe = () => {
			redisSubscriber.unsubscribe(topic);
			redisSubscriber.quit();
		};

		const abortListener = () => {
			unsubscribe();
			if (msgResolver) msgResolver();
		};
		context.signal.addEventListener("abort", abortListener);

		// 5. Process Waycast replies
		const processReplies = async () => {
			for await (const payload of request) {
				if (payload.waycastMessage) {
					// Route waycast message back to caller
					const msg = decode(payload.waycastMessage) as
						| GrpcRpcReplyMessage
						| GrpcDataMessage;
					if ("reply" in msg) {
						client.handleReply(msg as never);
					} else if ("data" in msg) {
						(
							client as unknown as { handleData: (msg: unknown) => void }
						).handleData(msg);
					} else {
						client.handleReply(msg as never);
					}
				}
			}
		};

		processReplies().catch((err) =>
			logger.error(`processReplies error: ${err}`),
		);

		// 6. Yield outgoing commands
		try {
			while (!context.signal.aborted) {
				if (msgQueue.length > 0) {
					const msg = msgQueue.shift();
					if (msg) yield msg;
				} else {
					await new Promise<void>((res) => {
						msgResolver = res;
					});
					msgResolver = null;
				}
			}
		} finally {
			context.signal.removeEventListener("abort", abortListener);
			unsubscribe();
			connectedWorkers.delete(workerId);
			await db
				.update(workers)
				.set({ status: "offline" })
				.where(eq(workers.id, workerId));
			logger.info(`Worker ${workerId} disconnected`);
		}
	},

	async sendMetrics(request, context) {
		const workerId = context.metadata.get("worker-id");
		if (typeof workerId !== "string") return { success: false };

		await db
			.update(workers)
			.set({
				status: "online",
				lastSeen: new Date(),
				cpuUsagePercent: request.cpuUsagePercent.toString(),
				memoryUsagePercent: request.memoryUsagePercent.toString(),
				storageUsagePercent: request.storageUsagePercent.toString(),
				score: request.score.toString(),
				activeLabs: request.activeLabs,
				activeNodes: request.activeNodes,
			})
			.where(eq(workers.id, workerId));

		return { success: true };
	},
};
