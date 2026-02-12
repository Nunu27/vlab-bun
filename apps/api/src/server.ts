import db, { checkAndRunMigration } from "@api/db";
import env, { inProduction } from "@api/env";
import { initClabSync } from "@api/services/clab-sync";
import baseLogger from "@api/services/logger";
import type { WebSocketData } from "@socket.io/bun-engine";
import type { Server } from "bun";
import { Elysia } from "elysia";
import { cache } from "./middlewares/caching";
import documentation from "./plugins/documentation";
import errorHandler from "./plugins/error-handler";
import fallback from "./plugins/fallback";
import logging from "./plugins/logging";
import security from "./plugins/security";
import routes from "./routes";
import guacamole from "./services/guacamole";
import redis from "./services/redis";
import ws from "./services/ws";

const logger = baseLogger.child({ service: "server" });

const app = new Elysia({
	cookie: { secrets: env.COOKIE_SECRET, secure: inProduction },
})
	.use(logging)
	.use(security)
	.use(documentation)
	.use(errorHandler)
	.use(fallback)
	.use(routes)
	.all(
		"/ws",
		async ({ request, server }) => {
			return ws.engine.handleRequest(request, server as Server<WebSocketData>);
		},
		{ detail: { hide: true } },
	);

async function shutdown() {
	logger.info("Shutting down...");

	await app.stop(true);
	await ws.io.close();

	guacamole.shutdown();

	await redis.client.quit();
	await db.$client.end();

	logger.info("Cleanup complete, exiting");
	process.exit(0);
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);

export type App = typeof app;
export async function startServer() {
	await cache.clear();

	await checkAndRunMigration();
	await initClabSync();

	guacamole.init();

	app.listen({ port: env.PORT, ...ws.engine.handler() }, ({ url }) => {
		logger.info(`Server running on port ${url}`);
	});
}
