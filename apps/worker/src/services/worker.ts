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

		const cpuAvailable = 100 - cpuUsage.percentage;
		const memAvailable = 100 - memoryUsage.percentage;
		const storageAvailable = 100 - storageInfo.percentage;

		// Hard-cap: critically low storage means no new labs can start
		const resourceScore =
			storageAvailable < 5
				? 0
				: cpuAvailable * 0.4 + memAvailable * 0.4 + storageAvailable * 0.2;

		// Penalize active labs as a tie-breaker between equally healthy workers
		const labPenalty = Math.min(monitorState.activeLabs * 5, 30);

		const score = Math.max(
			0,
			Math.min(100, Math.round(resourceScore - labPenalty)),
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
