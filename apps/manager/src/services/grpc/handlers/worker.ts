import db from "@manager/db";
import { workers } from "@manager/db/schema";
import env from "@manager/env";
import baseLogger from "@manager/lib/logger";
import redis from "@manager/lib/redis";
import ws from "@manager/services/ws";
import { AsyncQueue, appRouter, msgpackCodec, WorkerProto } from "@vlab/grpc";
import { eq, sql } from "drizzle-orm";
import type { WaycastClientTransport } from "waycast";
import { attachEvaluatorHandlers } from "./evaluator";
import { attachMonitorHandlers } from "./monitor";
import {
	reconcileWorkerSessions,
	regenerateWorkerTokens,
} from "./worker-reconcile";
import { connectedWorkers } from "./worker-registry";

const logger = baseLogger.child({ service: "worker-grpc" });

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
		const [{ createdAt, updatedAt, oldGuacdHost, oldGuacdPort, ...worker }] =
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
					oldGuacdHost: sql<string | null>`old.guacd_host`,
					oldGuacdPort: sql<number | null>`old.guacd_port`,
				});

		if (
			oldGuacdHost !== null &&
			(oldGuacdHost !== workerSpec.guacdHost ||
				oldGuacdPort !== workerSpec.guacdPort)
		) {
			logger.info(
				{
					workerId,
					oldWorker: { guacdHost: oldGuacdHost, guacdPort: oldGuacdPort },
					newSpec: workerSpec,
				},
				"Worker guacd configuration changed, regenerating tokens...",
			);
			regenerateWorkerTokens(
				workerId,
				workerSpec.guacdHost,
				workerSpec.guacdPort,
			).catch((err) =>
				logger.error(
					{ err, workerId },
					"Failed to regenerate tokens after worker guacd configuration change",
				),
			);
		}

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

		let deliverMessage: ((raw: string) => void) | undefined;
		let notifyClosed: (() => void) | undefined;

		const transport: WaycastClientTransport = {
			connect({ onOpen, onMessage, onClose }) {
				deliverMessage = onMessage;
				notifyClosed = onClose;
				onOpen();
			},
			send(raw) {
				msgQueue.push(
					WorkerProto.CommandRequest.create({
						payload: Buffer.from(raw, "base64"),
					}),
				);
			},
			disconnect() {
				msgQueue.close();
			},
		};

		const client = appRouter.buildClient({
			logger,
			transport,
			codec: msgpackCodec,
		});

		try {
			await redis.subscriber.subscribe(`vlab:worker-action:${workerId}`);
		} catch (error) {
			logger.error(
				{ err: error, workerId },
				"Failed to subscribe to worker action channel",
			);
		}

		attachMonitorHandlers(workerId, client);
		attachEvaluatorHandlers(workerId, client);

		connectedWorkers.set(workerId, client);

		reconcileWorkerSessions(workerId).catch((err) => {
			logger.error({ err, workerId }, "Failed to reconcile worker sessions");
		});

		const abortListener = () => {
			msgQueue.close();
		};
		context.signal.addEventListener("abort", abortListener);

		// 5. Process RPC replies
		const processReplies = async () => {
			for await (const requestPayload of request) {
				if (requestPayload.payload) {
					deliverMessage?.(
						Buffer.from(requestPayload.payload).toString("base64"),
					);
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
			notifyClosed?.();
			try {
				await redis.subscriber.unsubscribe(`vlab:worker-action:${workerId}`);
			} catch (error) {
				logger.error(
					{ err: error, workerId },
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
					deployingLab: 0,
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
			})
			.where(eq(workers.id, workerId))
			.returning({
				activeLabs: workers.activeLabs,
				activeNodes: workers.activeNodes,
			});

		ws.server.emit("admin:worker:metrics", {
			data: {
				id: workerId,
				cpuUsagePercent: request.cpuUsagePercent.toString(),
				memoryUsagePercent: request.memoryUsagePercent.toString(),
				storageUsagePercent: request.storageUsagePercent.toString(),
				activeLabs: updated?.activeLabs ?? 0,
				activeNodes: updated?.activeNodes ?? 0,
			},
		});

		return { success: true };
	},
};
