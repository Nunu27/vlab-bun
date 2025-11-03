import logger from "@backend/services/logger";

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

import { startServer, type App } from "./server";
await startServer();

export type { App };
