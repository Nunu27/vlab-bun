import db from "@manager/db";
import { workers } from "@manager/db/schema";
import env from "@manager/env";
import baseLogger from "@manager/lib/logger";
import redis from "@manager/lib/redis";
import ws from "@manager/services/ws";
import { decode, encode } from "@msgpack/msgpack";
import type { Static, TSchema } from "@sinclair/typebox";
import type {
	GrpcDataMessage,
	GrpcRpcReplyMessage,
	GrpcRpcRoutes,
} from "@vlab/grpc";
import { AsyncQueue, appRouter, WorkerProto } from "@vlab/grpc";
import { and, asc, eq, sql } from "drizzle-orm";
import { attachMonitorHandlers } from "./monitor";

const logger = baseLogger.child({ service: "worker-grpc" });

export const connectedWorkers = new Map<
	string,
	ReturnType<typeof appRouter.buildClient>
>();

export async function getAvailableWorkerId() {
	return await db.transaction(async (tx) => {
		const [selected] = await tx
			.select({ id: workers.id })
			.from(workers)
			.where(
				and(
					eq(workers.status, "online"),
					sql`${workers.cpuUsagePercent} < ${workers.cpuThresholdPercent}`,
					sql`${workers.memoryUsagePercent} < ${workers.memoryThresholdPercent}`,
				),
			)
			.orderBy(asc(workers.activeLabs))
			.limit(1)
			.for("update", { skipLocked: true });

		if (!selected) {
			throw new Error(
				"No workers available. All workers are offline or at capacity.",
			);
		}

		await tx
			.update(workers)
			.set({ activeLabs: sql`${workers.activeLabs} + 1` })
			.where(eq(workers.id, selected.id));

		return selected.id;
	});
}

export async function resetStaleWorkers() {
	await db
		.update(workers)
		.set({ status: "offline" })
		.where(
			and(eq(workers.managerId, env.MANAGER_ID), eq(workers.status, "online")),
		);
}

type ExtractReplyType<T> = T extends TSchema ? Static<T> : never;

export async function sendCommandToWorker<
	K extends Extract<keyof GrpcRpcRoutes, string>,
>(
	workerId: string,
	command: K,
	payload: Static<GrpcRpcRoutes[K]["payload"]>,
	replies?: {
		[R in keyof GrpcRpcRoutes[K]["replies"]]?: (
			data: ExtractReplyType<GrpcRpcRoutes[K]["replies"][R]>,
		) => void | Promise<void>;
	},
): Promise<void> {
	const client = connectedWorkers.get(workerId);
	if (!client) {
		throw new Error(`Worker ${workerId} is not connected to this manager!`);
	}

	return new Promise((resolve, reject) => {
		// @ts-expect-error: TS intersection of mapped types and spreads is too complex
		client.rpc(command, {
			params: undefined,
			payload,
			callbacks: {
				...replies,
				response: () => resolve(),
				error: (err: string) => reject(new Error(err)),
			},
		});
	});
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
		const [{ createdAt, updatedAt, ...worker }] = await db
			.insert(workers)
			.values({
				id: workerId,
				status: "online",
				managerId: env.MANAGER_ID,
				lastSeen: new Date(),
				cpuCores: workerSpec.cpuCores,
				memoryMB: workerSpec.memoryMb,
				storageMB: workerSpec.storageMb,
				guacdHost: workerSpec.guacdHost,
				guacdPort: workerSpec.guacdPort,
				cpuUsagePercent: "0",
				memoryUsagePercent: "0",
				storageUsagePercent: "0",
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
					guacdHost: workerSpec.guacdHost,
					guacdPort: workerSpec.guacdPort,
				},
			})
			.returning({
				id: workers.id,
				status: workers.status,
				lastSeen: workers.lastSeen,
				cpuCores: workers.cpuCores,
				memoryMB: workers.memoryMB,
				storageMB: workers.storageMB,
				cpuUsagePercent: workers.cpuUsagePercent,
				memoryUsagePercent: workers.memoryUsagePercent,
				storageUsagePercent: workers.storageUsagePercent,
				activeLabs: workers.activeLabs,
				activeNodes: workers.activeNodes,
				createdAt: workers.createdAt,
				updatedAt: workers.updatedAt,
			});

		if (updatedAt?.getTime() === createdAt.getTime()) {
			ws.server.emit("admin:worker:new", { data: worker });
		} else {
			ws.server.emit("admin:worker:status", {
				data: {
					id: worker.id,
					status: "online",
					lastSeen: worker.lastSeen,
				},
			});
		}

		logger.info(`Worker ${workerId} connected`);

		// 3. Create RPC client for this worker
		const msgQueue = new AsyncQueue<WorkerProto.CommandRequest>();

		const client = appRouter.buildClient({
			logger,
			send: async (message) => {
				msgQueue.push(
					WorkerProto.CommandRequest.create({
						payload: Buffer.from(encode(message)),
					}),
				);
			},
		});

		try {
			await redis.subscriber.subscribe(`vlab:worker-action:${workerId}`);
		} catch (error) {
			logger.error(
				{ error, workerId },
				"Failed to subscribe to worker action channel",
			);
		}

		attachMonitorHandlers(workerId, client, {
			guacdHost: workerSpec.guacdHost,
			guacdPort: workerSpec.guacdPort,
		});

		connectedWorkers.set(workerId, client);

		const abortListener = () => {
			msgQueue.close();
		};
		context.signal.addEventListener("abort", abortListener);

		// 5. Process RPC replies
		const processReplies = async () => {
			for await (const requestPayload of request) {
				if (requestPayload.payload) {
					// Route message back to caller
					const msg = decode(requestPayload.payload) as
						| GrpcRpcReplyMessage
						| GrpcDataMessage;

					if ("data" in msg) {
						client.handleData(msg);
					} else {
						client.handleReply(msg);
					}
				}
			}
		};

		processReplies().catch((err) =>
			logger.error(`processReplies error: ${err}`),
		);

		// 6. Yield outgoing commands
		try {
			for await (const msg of msgQueue) {
				yield msg;
			}
		} finally {
			context.signal.removeEventListener("abort", abortListener);
			logger.info({ workerId }, "Worker stream ended");
			connectedWorkers.delete(workerId);
			try {
				await redis.subscriber.unsubscribe(`vlab:worker-action:${workerId}`);
			} catch (error) {
				logger.error(
					{ error, workerId },
					"Failed to unsubscribe from worker action channel",
				);
			}
			const now = new Date();
			await db
				.update(workers)
				.set({
					status: "offline",
					lastSeen: now,
					activeLabs: 0,
					activeNodes: 0,
				})
				.where(eq(workers.id, workerId));

			ws.server.emit("admin:worker:status", {
				data: {
					id: workerId,
					status: "offline",
					lastSeen: now,
				},
			});
		}
	},

	async sendMetrics(request, context) {
		const workerId = context.metadata.get("worker-id");
		if (!workerId) return { success: false };

		const [updated] = await db
			.update(workers)
			.set({
				status: "online",
				lastSeen: new Date(),
				cpuUsagePercent: request.cpuUsagePercent.toString(),
				memoryUsagePercent: request.memoryUsagePercent.toString(),
				storageUsagePercent: request.storageUsagePercent.toString(),
				activeNodes: request.activeNodes,
			})
			.where(eq(workers.id, workerId))
			.returning({ activeLabs: workers.activeLabs });

		ws.server.emit("admin:worker:metrics", {
			data: {
				id: workerId,
				cpuUsagePercent: request.cpuUsagePercent.toString(),
				memoryUsagePercent: request.memoryUsagePercent.toString(),
				storageUsagePercent: request.storageUsagePercent.toString(),
				activeLabs: updated?.activeLabs ?? 0,
				activeNodes: request.activeNodes,
			},
		});

		return { success: true };
	},
};
