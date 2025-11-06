import logger from "@backend/services/logger";
import cluster from "node:cluster";
import os from "node:os";
import process from "node:process";

const command = process.argv[2];

if (command === "seed") {
	logger.info("🌱 Running database seeding...");
	try {
		await import("@backend/seeder");
	} catch (error) {
		logger.error({ error }, "Seeding failed");
		process.exit(1);
	}
} else if (command) {
	logger.error(`Unknown command: ${command}`);
	logger.info("Available commands: seed");
	process.exit(1);
}

if (cluster.isPrimary) {
	for (let i = 0; i < os.availableParallelism(); i++) cluster.fork();
} else {
	const { startServer } = await import("./server");

	startServer();
	logger.info(`Worker ${process.pid} started`);
}
