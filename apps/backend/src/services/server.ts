import { checkAndRunMigration } from "@backend/db";
import { cleanupDBListeners, syncDBListeners, syncDBChannels } from "@backend/db/listener";
import env, { inProduction } from "@backend/env";
import { clearCache } from "@backend/middlewares/caching";
import services from "@backend/plugins/services";
import routes from "@backend/routes";
import { initGuacamole, shutdownGuacamole } from "@backend/services/guacamole";
import logger from "@backend/services/logger";
import staticPlugin from "@elysiajs/static";
import type { WebSocketData } from "@socket.io/bun-engine";
import { file, type Server } from "bun";
import { Elysia } from "elysia";
import cluster from "node:cluster";
import { startDockerMonitor } from "./docker-monitor";
import { redisClient } from "./redis";
import { engine, io } from "./ws";

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
	.all(
		"/favicon.ico",
		({ status }) => status(200, file("public/favicon.ico")),
		{
			detail: { hide: true }
		}
	)
	.all(
		"/ws",
		async ({ request, server }) => {
			return engine.handleRequest(request, server as Server<WebSocketData>);
		},
		{ detail: { hide: true } }
	);

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

		await startDockerMonitor();

		initGuacamole();
	}

	await syncDBChannels();

	app.listen({ port: env.PORT, ...engine.handler() }, (app) => {
		logger.info(`Server running on ${app.url.origin}`);
	});
}

export type App = typeof app;
