import { METRICS_INTERVAL_MS } from "@worker/constants";
import baseLogger from "@worker/lib/logger";
import {
	getCpuUsage,
	getMemoryUsage,
	getStorageInfo,
} from "@worker/lib/system-metrics";
import { metadata, workerClient } from "./client";

const logger = baseLogger.child({ service: "grpc" });

let timer: ReturnType<typeof setInterval> | undefined;

async function sendMetrics() {
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
		// Expected while disconnected from the manager; the reconnect loop
		// handles recovery, this loop just keeps ticking.
		logger.debug({ err }, "Failed to send metrics");
	}
}

export function startMetricsLoop() {
	timer = setInterval(sendMetrics, METRICS_INTERVAL_MS);
}

export function stopMetricsLoop() {
	if (timer) clearInterval(timer);
	timer = undefined;
}
