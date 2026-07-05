import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	MIKROTIK_NOREBOOT_CONTENT,
	MIKROTIK_NOREBOOT_FILENAME,
} from "@worker/constants";
import { stopAllEvaluationsImmediately } from "@worker/domain/evaluation";
import { checkPrerequisites } from "@worker/domain/lab/reconcile";
import env from "@worker/env";
import { resolveGuacdIp } from "@worker/lib/guacd";
import baseLogger from "@worker/lib/logger";
import {
	channel,
	runConnectionLoop,
	server,
	startMetricsLoop,
	stopConnectionLoop,
	stopMetricsLoop,
} from "@worker/services/grpc";
import {
	startMonitorService,
	stopMonitorService,
} from "@worker/services/monitor";

const logger = baseLogger.child({ service: "core" });

export async function startServer() {
	logger.info("Worker starting...");

	logger.info("Checking prerequisites...");
	await checkPrerequisites();
	logger.info("Prerequisites check passed.");

	env.GUACD_IP = await resolveGuacdIp();
	logger.info({ guacdIp: env.GUACD_IP }, "Resolved guacd IP");

	await mkdir(env.CLAB_TOPOLOGIES_PATH, { recursive: true });
	await writeFile(
		path.join(env.CLAB_TOPOLOGIES_PATH, MIKROTIK_NOREBOOT_FILENAME),
		MIKROTIK_NOREBOOT_CONTENT,
	);

	startMonitorService(server);
	startMetricsLoop();
	void runConnectionLoop();

	process.once("SIGINT", () => shutdown("SIGINT"));
	process.once("SIGTERM", () => shutdown("SIGTERM"));
}

let shuttingDown = false;

async function shutdown(signal: string) {
	if (shuttingDown) return;
	shuttingDown = true;

	logger.info(`Received ${signal}, shutting down gracefully...`);

	stopMetricsLoop();
	stopConnectionLoop();
	stopMonitorService();
	await stopAllEvaluationsImmediately();
	channel.close();

	process.exit(0);
}
