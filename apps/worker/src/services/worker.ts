import os from "node:os";
import { decode } from "@msgpack/msgpack";
import type { AsyncQueue, GrpcRequestMessage, WorkerProto } from "@vlab/grpc";
import baseLogger from "@worker/lib/logger";
import type { RpcServer } from "../handlers/server";
import {
	getCpuUsagePercent,
	getMemoryUsagePercent,
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
			storageMb: Math.round(getStorageInfo().totalMb),
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
		const cpuUsagePercent = getCpuUsagePercent();
		const memoryUsagePercent = getMemoryUsagePercent();
		const storageInfo = getStorageInfo();
		const storageUsagePercent = storageInfo.usedPercent;

		const cpuWeight = 0.3;
		const memWeight = 0.45;
		const storageWeight = 0.1;
		const labWeight = 0.15;

		// Treat 10 concurrent labs as the soft saturation point
		const LAB_SOFT_CAP = 10;
		const labPressure = Math.min(monitorState.activeLabs / LAB_SOFT_CAP, 1);

		// Capacity-aware scaling: penalize smaller-than-reference workers more
		// steeply for the same usage%, and larger workers more leniently.
		// Reference: 16 GB RAM, 8 cores. Clamped to [0.5, 2.0].
		const REF_MEM_GB = 16;
		const REF_CORES = 8;
		const totalMemGB = os.totalmem() / 1024 ** 3;
		const totalCores = os.cpus().length;
		const memScale = Math.min(Math.max(REF_MEM_GB / totalMemGB, 0.5), 2);
		const cpuScale = Math.min(Math.max(REF_CORES / totalCores, 0.5), 2);

		let score =
			100 -
			((cpuUsagePercent / 100) ** 2 * cpuWeight * 100 * cpuScale +
				(memoryUsagePercent / 100) ** 2 * memWeight * 100 * memScale +
				(storageUsagePercent / 100) ** 2 * storageWeight * 100 +
				labPressure ** 2 * labWeight * 100);

		// Applied independently so a worker critical on both takes -60
		if (memoryUsagePercent > 90) score -= 30;
		// 85% threshold — image pulls can fail before disk is completely full
		if (storageUsagePercent > 85) score -= 30;

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
