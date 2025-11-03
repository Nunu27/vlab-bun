import env from "@backend/env";

import { cleanupDBListeners, syncDBListeners } from "@backend/db/listener";
import { clearCache } from "@backend/middlewares/caching";
import logger from "@backend/services/logger";
import { Elysia, file } from "elysia";

import services from "@backend/plugins/services";
import routes from "@backend/routes";
import { checkAndRunMigration } from "./db";
import staticPlugin from "@elysiajs/static";

const app = new Elysia()
	.use(
		staticPlugin({
			prefix: "/static",
			assets: "public/static"
		})
	)
	.use(services)
	.use(routes);

const shutdown = async (signal: string) => {
	logger.info(`${signal} received, shutting down...`);
	await cleanupDBListeners();
	logger.info("Cleanup complete, exiting");
	process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export async function startServer() {
	await checkAndRunMigration();
	await syncDBListeners();
	await clearCache();

	app.listen(env.PORT, (app) => {
		logger.info(`Server running on ${app.url.origin}`);
	});
}

export type App = typeof app;
