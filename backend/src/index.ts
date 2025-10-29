import env from "@backend/env";

import { cleanupDBListeners, syncDBListeners } from "@backend/db/listener";
import { clearCache } from "@backend/middlewares/caching";
import logger from "@backend/services/logger";
import { Elysia } from "elysia";

import services from "@backend/plugins/services";
import routes from "@backend/routes";

await syncDBListeners();
await clearCache();

const app = new Elysia()
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

export type App = typeof app;
