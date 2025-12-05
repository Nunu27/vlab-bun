import logger from "@backend/services/logger";
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
} else if (command && !command.endsWith("vlab")) {
	logger.error(`Unknown command: ${command}`);
	logger.info("Available commands: seed");
	process.exit(1);
}

import { startServer } from "./services/server";

await startServer();

// NOTE: Disable multi-core because it might cause syncronization issues
// if (cluster.isPrimary && inProduction) {
// 	for (let i = 1; i < os.availableParallelism(); i++) cluster.fork();
// }
