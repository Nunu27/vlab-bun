import { AsyncQueue, type WorkerProto } from "@vlab/grpc";
import clab from "@worker/lib/clab";
import baseLogger from "@worker/lib/logger";
import { initRpc } from "./handlers/index";
import { bindMonitorEvents } from "./services/monitor";
import { listenToCommands, streamMetrics } from "./services/worker";

const logger = baseLogger.child({ service: "core" });

logger.info("Worker starting...");

try {
	logger.info("Checking prerequisites...");
	await clab.checkPrerequisites();
	logger.info("Prerequisites check passed.");
} catch (error) {
	logger.fatal(
		{
			err: error,
			reason: error instanceof Error ? error.message : String(error),
		},
		"Failed to start worker due to prerequisites check failure",
	);
	process.exit(1);
}

const replyQueue = new AsyncQueue<WorkerProto.CommandPayload>();
const server = initRpc(replyQueue);

listenToCommands(server, replyQueue);
streamMetrics();
bindMonitorEvents(server);

function shutdown(signal: string) {
	logger.info(`Received ${signal}, shutting down gracefully...`);
	// Add any additional cleanup logic here if needed
	process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
	logger.error({ err: reason }, "Unhandled Rejection");
});
process.on("uncaughtException", (error) => {
	// Per Node's own guidance, the process is in an undefined state after an
	// uncaught exception (e.g. containerlab child-process/docker-stream state
	// may be corrupted) — log with a real stack trace, then exit and let the
	// process supervisor restart us cleanly instead of limping on.
	logger.fatal({ err: error }, "Uncaught Exception, exiting");
	process.exit(1);
});
