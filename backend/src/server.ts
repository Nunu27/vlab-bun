import { cleanupDBListeners, syncDBListeners } from "@backend/db/listener";
import env, { inProduction } from "@backend/env";
import { clearCache } from "@backend/middlewares/caching";
import services from "@backend/plugins/services";
import routes from "@backend/routes";
import logger from "@backend/services/logger";
import staticPlugin from "@elysiajs/static";
import { Elysia } from "elysia";
import cluster from "node:cluster";
import { checkAndRunMigration } from "./db";
import ws from "./plugins/ws";

const app = new Elysia()
	.use(
		inProduction
			? staticPlugin({
					prefix: "/static",
					assets: "public/static",
					alwaysStatic: true
				})
			: undefined
	)
	.use(ws({}))
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
	if (cluster.isPrimary) {
		await checkAndRunMigration();
		await syncDBListeners();
		await clearCache();
	}

	app.listen(env.PORT, (app) => {
		logger.info(`Server running on ${app.url.origin}`);
	});
}

export type App = typeof app;
