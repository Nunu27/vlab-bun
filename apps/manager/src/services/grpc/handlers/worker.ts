import db from "@manager/db";
import {
	deviceTemplates,
	labSessionNodes,
	labSessions,
	workers,
} from "@manager/db/schema";
import env from "@manager/env";
import baseLogger from "@manager/lib/logger";
import redis from "@manager/lib/redis";
import guacamole from "@manager/services/guacamole-lite";
import ws from "@manager/services/ws";
import type {
	GrpcRoutes,
	GrpcRpcCallbacks,
	GrpcRpcPayloadOf,
	GrpcRpcResponseOf,
} from "@vlab/grpc";
import { AsyncQueue, appRouter, msgpackCodec, WorkerProto } from "@vlab/grpc";
import { and, asc, eq, sql } from "drizzle-orm";
import type { WaycastClientTransport } from "waycast";
import { attachMonitorHandlers } from "./monitor";

const logger = baseLogger.child({ service: "worker-grpc" });

export const connectedWorkers = new Map<
	string,
	ReturnType<typeof appRouter.buildClient>
>();

export const DEFAULT_CPU_COST_CORES = 0.5;
export const DEFAULT_MEMORY_COST_MB = 512;

async function tryGetAvailableWorkerId(
	cpuCostCores: number,
	memoryCostMB: number,
): Promise<string | null> {
	return await db.transaction(async (tx) => {
		const [selected] = await tx
			.select({ id: workers.id })
			.from(workers)
			.where(
				and(
					eq(workers.status, "online"),
					sql`(1 - ${workers.cpuUsagePercent} / 100.0) * ${workers.cpuCores} >= ${cpuCostCores}`,
					sql`(1 - ${workers.memoryUsagePercent} / 100.0) * ${workers.memoryMB} >= ${memoryCostMB}`,
					sql`${workers.deployingLab} < ${workers.cpuCores}`,
				),
			)
			.orderBy(asc(workers.activeLabs))
			.limit(1)
			.for("update", { skipLocked: true });

		if (!selected) {
			return null;
		}

		await tx
			.update(workers)
			.set({
				activeLabs: sql`${workers.activeLabs} + 1`,
				deployingLab: sql`${workers.deployingLab} + 1`,
			})
			.where(eq(workers.id, selected.id));

		return selected.id;
	});
}

export type WaitForWorkerOptions = {
	timeoutMs?: number;
	initialDelayMs?: number;
	maxDelayMs?: number;
	backoffFactor?: number;
	onWait?: (attempt: number, delayMs: number) => void;
};

export async function waitForAvailableWorkerId(
	cpuCostCores = DEFAULT_CPU_COST_CORES,
	memoryCostMB = DEFAULT_MEMORY_COST_MB,
	options?: WaitForWorkerOptions,
): Promise<string> {
	const timeoutMs = options?.timeoutMs ?? 30_000;
	const initialDelayMs = options?.initialDelayMs ?? 500;
	const maxDelayMs = options?.maxDelayMs ?? 5_000;
	const backoffFactor = options?.backoffFactor ?? 1.5;

	const startTime = Date.now();
	let currentDelayMs = initialDelayMs;
	let attempt = 1;

	while (Date.now() - startTime < timeoutMs) {
		const workerId = await tryGetAvailableWorkerId(cpuCostCores, memoryCostMB);
		if (workerId) return workerId;

		options?.onWait?.(attempt, currentDelayMs);

		await new Promise((resolve) => setTimeout(resolve, currentDelayMs));

		currentDelayMs = Math.min(currentDelayMs * backoffFactor, maxDelayMs);
		attempt++;
	}

	throw new Error(
		`No worker nodes available after ${Math.round(timeoutMs / 1000)}s of retrying. All workers are offline or at capacity, please try again shortly.`,
	);
}

export async function resetStaleWorkers() {
	await db
		.update(workers)
		.set({ status: "offline" })
		.where(
			and(eq(workers.managerId, env.MANAGER_ID), eq(workers.status, "online")),
		);
}

// Called right after a worker connects. The worker may have leftover local
// containerlab deployments from a crash, restart, or a destroy command that
// never reached it while it was disconnected, so the manager hands it the
// sessions it still considers active, and the worker tears down anything
// deployed locally that isn't on that list.
async function reconcileWorkerSessions(workerId: string) {
	const activeSessions = await db.query.labSessions.findMany({
		columns: { id: true },
		where: (labSessions, { eq, and, isNull }) =>
			and(eq(labSessions.workerId, workerId), isNull(labSessions.submittedAt)),
	});

	const destroyed = await sendCommandToWorker(
		workerId,
		"clab:reconcileSessions",
		{
			activeSessionIds: activeSessions.map((s) => s.id),
		},
	);

	if (destroyed.length) {
		logger.warn(
			{ workerId, destroyed },
			"Worker destroyed stale lab sessions not tracked as active by the manager",
		);
	}
}

async function regenerateWorkerTokens(
	workerId: string,
	guacdHost: string,
	guacdPort: number,
) {
	// Find all nodes that need token regeneration
	const nodes = await db
		.select({
			nodeId: labSessionNodes.id,
			ip: labSessionNodes.ip,
			connection: deviceTemplates.connection,
			kind: deviceTemplates.kind,
		})
		.from(labSessionNodes)
		.innerJoin(labSessions, eq(labSessionNodes.labSessionId, labSessions.id))
		.innerJoin(
			deviceTemplates,
			eq(labSessionNodes.deviceTemplateId, deviceTemplates.id),
		)
		.where(eq(labSessions.workerId, workerId));

	if (nodes.length === 0) return;

	// Batch update tokens
	await db.transaction(async (tx) => {
		for (const node of nodes) {
			const newToken = guacamole.generateNodeToken(
				node.connection,
				node.kind,
				node.ip,
				guacdHost,
				guacdPort,
			);

			await tx
				.update(labSessionNodes)
				.set({ token: newToken })
				.where(eq(labSessionNodes.id, node.nodeId));
		}
	});

	logger.info(
		{ workerId, nodeCount: nodes.length },
		"Successfully regenerated tokens for worker",
	);
}

export async function getWorker(workerId: string) {
	const worker = connectedWorkers.get(workerId);
	if (!worker) {
		throw new Error(`Worker ${workerId} is not connected to this manager!`);
	}

	return worker;
}

export async function sendCommandToWorker<
	K extends Extract<keyof GrpcRoutes, string>,
>(
	workerId: string,
	command: K,
	payload: GrpcRpcPayloadOf<K>,
	replies?: Omit<GrpcRpcCallbacks<K>, "response" | "error">,
): Promise<GrpcRpcResponseOf<K>> {
	const client = await getWorker(workerId);

	return new Promise((resolve, reject) => {
		// @ts-expect-error: TS intersection of mapped types and spreads is too complex
		client.rpc(command, {
			payload,
			callbacks: {
				...replies,
				response: resolve,
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

		// 2. Upsert worker into DB, pulling the pre-upsert guacd config out of the
		// same statement via Postgres 18's `RETURNING old.col`/`new.col` — no
		// separate SELECT needed to detect a guacd change.
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

		attachMonitorHandlers(
			workerId,
			client,
			workerSpec.guacdHost,
			workerSpec.guacdPort,
		);

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
