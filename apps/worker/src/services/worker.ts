import os from "node:os";
import type { AsyncQueue, WorkerProto } from "@vlab/grpc";
import baseLogger from "@worker/lib/logger";
import {
	getCpuUsage,
	getMemoryUsage,
	getStorageInfo,
} from "../lib/system-metrics";
import { metadata, workerClient } from "./client";

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
	feedMessage: (raw: string) => void,
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
				feedMessage(Buffer.from(req.payload).toString("base64"));
			} catch (err) {
				logger.error({ err }, "Failed to parse or handle command");
			}
		}
	} catch (err) {
		logger.warn(
			{ err },
			"ListenCommand stream disconnected or ended with error. Reconnecting in 5s...",
		);
		setTimeout(() => listenToCommands(feedMessage, replyQueue), 5000);
	}
}

export async function streamMetrics() {
	try {
		const cpuUsage = getCpuUsage();
		const memoryUsage = getMemoryUsage();
		const storageInfo = getStorageInfo();

		await workerClient.sendMetrics(
			{
				cpuUsagePercent: cpuUsage.percentage,
				memoryUsagePercent: memoryUsage.percentage,
				storageUsagePercent: storageInfo.percentage,
			},
			{ metadata },
		);
	} catch (err) {
		logger.error({ err }, "Failed to send metrics");
	}
	setTimeout(streamMetrics, 10000);
}
