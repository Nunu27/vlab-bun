import { checkAndRunMigration } from "@backend/db";
import { cleanupDBListeners, syncDBListeners } from "@backend/db/listener";
import env, { inProduction } from "@backend/env";
import { clearCache } from "@backend/middlewares/caching";
import services from "@backend/plugins/services";
import routes from "@backend/routes";
import { initGuacamole, shutdownGuacamole } from "@backend/services/guacamole";
import logger from "@backend/services/logger";
import staticPlugin from "@elysiajs/static";
import type { WebSocketData } from "@socket.io/bun-engine";
import type { Server } from "bun";
import { Elysia } from "elysia";
import cluster from "node:cluster";
import { engine, io } from "./ws";
import { redisClient } from "./redis";

const app = new Elysia({
	cookie: { secrets: env.COOKIE_SECRET, secure: inProduction }
})
	.use(
		inProduction
			? staticPlugin({
					prefix: "/static",
					assets: "public/static"
			  })
			: undefined
	)
	.use(services)
	.use(routes)
	.resolve(() => {})
	.all("/ws", async ({ request, server }) => {
		return engine.handleRequest(request, server as Server<WebSocketData>);
	});

const shutdown = async (signal: string) => {
	logger.info(`${signal} received, shutting down...`);
	await shutdownGuacamole();
	await cleanupDBListeners();
	await io.close();
	await redisClient.quit();
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

		initGuacamole();
	}

	app.listen({ port: env.PORT, ...engine.handler() }, (app) => {
		logger.info(`Server running on ${app.url.origin}`);
	});
}

export type App = typeof app;
