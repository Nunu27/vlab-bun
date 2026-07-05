import baseLogger from "./lib/logger";

const logger = baseLogger.child({ service: "core" });

process.on("unhandledRejection", (reason) => {
	logger.error({ err: reason }, "Unhandled Rejection");
});
process.on("uncaughtException", (error) => {
	logger.fatal({ err: error }, "Uncaught Exception, exiting");
	process.exit(1);
});

const commands: Record<string, () => Promise<void>> = {
	serve: async () => {
		const { startServer } = await import("./server");
		await startServer();
	},
};

const commandName = process.argv[2] ?? "serve";
const command = commands[commandName];

if (!command) {
	console.error(`Unknown command: ${commandName}`);
	console.error(`Available commands: ${Object.keys(commands).join(", ")}`);
	process.exit(1);
}

try {
	await command();
} catch (error) {
	logger.fatal({ err: error, command: commandName }, "Worker failed to start");
	process.exit(1);
}
