import { pino } from "pino";
import { bindMonitorEvents } from "./services/monitor";
import { listenToCommands, streamMetrics } from "./services/worker";

const logger = pino({ name: "worker" });

logger.info("Worker starting...");

listenToCommands();
streamMetrics();
bindMonitorEvents();

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
