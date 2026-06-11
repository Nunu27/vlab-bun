import os from "node:os";
import { decode } from "@msgpack/msgpack";
import { AsyncQueue, type WorkerProto } from "@vlab/grpc";
import baseLogger from "@worker/lib/logger";
import { initRpc } from "../handlers/index";
import {
	getCpuUsagePercent,
	getMemoryUsagePercent,
	getStorageInfo,
} from "../lib/system-metrics";
import { metadata, workerClient } from "./client";
import { monitorState } from "./monitor";

export const replyQueue = new AsyncQueue<WorkerProto.CommandPayload>();
export const server = initRpc(replyQueue);

const logger = baseLogger.child({ service: "grpc" });

async function* createReplyStream(): AsyncIterable<WorkerProto.CommandPayload> {
	yield {
		workerSpec: {
			cpuCores: os.cpus().length,
			memoryMb: Math.round(os.totalmem() / 1024 / 1024),
			storageMb: Math.round(getStorageInfo().totalMb),
		},
	};

	for await (const reply of replyQueue) {
		yield reply;
	}
}

export async function listenToCommands() {
	try {
		logger.info("Connecting to Manager gRPC server...");
		const requestStream = workerClient.listenCommand(createReplyStream(), {
			metadata,
		});
		logger.info(
			"Successfully connected to Manager gRPC server and started ListenCommand stream",
		);
		for await (const req of requestStream) {
			try {
				if (req.payload) {
					const message = decode(req.payload) as {
						id?: string;
						[k: string]: unknown;
					};
					const requestId = message.id || Math.random().toString(36).slice(2);

					server
						.handle(
							"manager",
							requestId,
							message as Parameters<typeof server.handle>[2],
							async () => ({}),
						)
						.catch((err) => {
							logger.error(
								{ err },
								`[RPC] Unhandled error in command ${requestId}`,
							);
						});
				}
			} catch (err) {
				logger.error({ err }, "Failed to parse or handle command");
			}
		}
	} catch (err) {
		logger.warn(
			{ err },
			"ListenCommand stream disconnected or ended with error. Reconnecting in 5s...",
		);
		setTimeout(listenToCommands, 5000);
	}
}

export async function streamMetrics() {
	try {
		const cpuUsagePercent = getCpuUsagePercent();
		const memoryUsagePercent = getMemoryUsagePercent();
		const storageInfo = getStorageInfo();
		const storageUsagePercent = storageInfo.usedPercent;

		const cpuWeight = 0.35;
		const memWeight = 0.5;
		const storageWeight = 0.15;

		let score =
			100 -
			((cpuUsagePercent / 100) ** 2 * cpuWeight * 100 +
				(memoryUsagePercent / 100) ** 2 * memWeight * 100 +
				(storageUsagePercent / 100) ** 2 * storageWeight * 100);

		if (memoryUsagePercent > 90 || storageUsagePercent > 90) {
			score -= 50;
		}

		score = Math.max(0, Math.min(100, Math.round(score)));

		await workerClient.sendMetrics(
			{
				cpuUsagePercent,
				memoryUsagePercent,
				storageUsagePercent,
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
