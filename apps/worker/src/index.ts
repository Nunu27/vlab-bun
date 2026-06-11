import { AsyncQueue, type WorkerProto } from "@vlab/grpc";
import baseLogger from "@worker/lib/logger";
import { initRpc } from "./handlers/index";
import { bindMonitorEvents } from "./services/monitor";
import { listenToCommands, streamMetrics } from "./services/worker";

const logger = baseLogger.child({ service: "core" });

logger.info("Worker starting...");

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
process.on("unhandledRejection", (reason, promise) => {
	logger.error({ reason, promise }, "Unhandled Rejection");
});
process.on("uncaughtException", (error) => {
	logger.error({ error }, "Uncaught Exception");
});
