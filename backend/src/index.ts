import env from "@/env";

import { cleanupDBListeners, syncDBListeners } from "@/db/listener";
import { clearCache } from "@/middlewares/caching";
import logger from "@/services/logger";
import { Elysia } from "elysia";

import services from "@/plugins/services";
import routes from "@/routes";

await syncDBListeners();
await clearCache();

new Elysia()
	.use(services)
	.use(routes)
	.listen(env.PORT, (app) => {
		logger.info(`Server running on ${app.url.origin}`);
	});

const shutdown = async (signal: string) => {
	logger.info(`${signal} received, shutting down...`);
	await cleanupDBListeners();
	logger.info("Cleanup complete, exiting");
	process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
