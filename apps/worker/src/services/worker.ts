import os from "node:os";
import { decode } from "@msgpack/msgpack";
import type { AsyncQueue, GrpcRequestMessage, WorkerProto } from "@vlab/grpc";
import baseLogger from "@worker/lib/logger";
import type { RpcServer } from "../handlers/server";
import {
	getCpuUsage,
	getMemoryUsage,
	getStorageInfo,
} from "../lib/system-metrics";
import { metadata, workerClient } from "./client";
import { monitorState } from "./monitor";

const logger = baseLogger.child({ service: "grpc" });

import env from "../env";

// Nominal cost of a single lab, used to express a worker's free capacity as
// "how many more labs fit". These are rough averages, not hard limits — they
// only need to be consistent across workers for the score to rank correctly.
const LAB_CPU_CORES = 1;
const LAB_MEM_MB = 1024;
const LAB_STORAGE_MB = 4096;

async function* createReplyStream(
	replyQueue: AsyncQueue<WorkerProto.CommandPayload>,
): AsyncIterable<WorkerProto.CommandPayload> {
	yield {
		workerSpec: {
			cpuCores: os.cpus().length,
			memoryMb: Math.round(os.totalmem() / 1024 / 1024),
			storageMb: Math.round(getStorageInfo().total),
			guacdHost: env.GUACD_HOST,
			guacdPort: env.GUACD_PORT,
		},
	};

	for await (const reply of replyQueue) {
		yield reply;
	}
}

export async function listenToCommands(
	server: RpcServer,
	replyQueue: AsyncQueue<WorkerProto.CommandPayload>,
) {
	try {
		logger.info("Connecting to Manager gRPC server...");
		const requestStream = workerClient.listenCommand(
			createReplyStream(replyQueue),
			{ metadata },
		);
		logger.info(
			"Successfully connected to Manager gRPC server and started ListenCommand stream",
		);
		for await (const req of requestStream) {
			try {
				const message = decode(req.payload) as GrpcRequestMessage;
				server.handle("manager", message);
			} catch (err) {
				logger.error({ err }, "Failed to parse or handle command");
			}
		}
	} catch (err) {
		logger.warn(
			{ err },
			"ListenCommand stream disconnected or ended with error. Reconnecting in 5s...",
		);
		setTimeout(() => listenToCommands(server, replyQueue), 5000);
	}
}

export async function streamMetrics() {
	try {
		const cpuUsage = getCpuUsage();
		const memoryUsage = getMemoryUsage();
		const storageInfo = getStorageInfo();

		// Absolute free capacity per resource. Using absolute values (not
		// percentages) lets workers of different sizes be compared fairly: a
		// 64-core worker at 50% idle has far more headroom than a 4-core worker
		// at 50% idle, even though their percentages are identical.
		const cpuFreeCores = os.cpus().length * (1 - cpuUsage.percentage / 100);
		const memFreeMb = memoryUsage.available;
		const storageFreeMb = storageInfo.available;

		// Express headroom as "how many more labs fit", gated by the scarcest
		// resource (bottleneck). A single saturated resource caps the score, so
		// a worker that is out of RAM can't win on spare CPU alone.
		const fits = Math.min(
			cpuFreeCores / LAB_CPU_CORES,
			memFreeMb / LAB_MEM_MB,
			storageFreeMb / LAB_STORAGE_MB,
		);

		// Scale to integer points (10 per lab of headroom) and apply a small
		// tie-breaker against already-busy workers to spread placements while
		// metrics catch up. No upper clamp: bigger workers should score higher.
		const score = Math.max(
			0,
			Math.round(fits * 10) - Math.min(monitorState.activeLabs, 5),
		);

		await workerClient.sendMetrics(
			{
				cpuUsagePercent: cpuUsage.percentage,
				memoryUsagePercent: memoryUsage.percentage,
				storageUsagePercent: storageInfo.percentage,
				score,
				activeLabs: monitorState.activeLabs,
				activeNodes: monitorState.activeNodes,
			},
			{ metadata },
		);
	} catch (err) {
		logger.error({ err }, "Failed to send metrics");
	}
	setTimeout(streamMetrics, 10000);
}
