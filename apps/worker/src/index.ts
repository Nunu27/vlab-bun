import { bindMonitorEvents } from "./services/monitor";
import { listenToCommands, streamMetrics } from "./services/worker";

console.log("Worker starting...");

listenToCommands();
streamMetrics();
bindMonitorEvents();

function shutdown(signal: string) {
	console.log(`Received ${signal}, shutting down gracefully...`);
	// Add any additional cleanup logic here if needed
	process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
