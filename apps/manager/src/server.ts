import db, { checkAndRunMigration } from "@manager/db";
import env from "@manager/env";
import baseLogger from "@manager/lib/logger";
import type { WebSocketData } from "@socket.io/bun-engine";
import type { Server } from "bun";
import { Elysia } from "elysia";
import redis from "./lib/redis";

import guacamoleLite from "./services/guacamole-lite";
import httpHandler from "./services/http";
import { cache } from "./services/http/middlewares/caching";
import ws from "./services/ws";

import "./services/ws/routes";

const logger = baseLogger.child({ service: "server" });

const app = new Elysia().use(httpHandler).all(
	"/ws",
	async ({ request, server }) => {
		return ws.engine.handleRequest(request, server as Server<WebSocketData>);
	},
	{ detail: { hide: true } },
);

import grpcServer from "./services/grpc";

async function shutdown() {
	logger.info("Shutting down...");

	grpcServer.forceShutdown();
	await app.stop(true);
	await ws.io.close();

	guacamoleLite.shutdown();

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

	guacamoleLite.init();

	app.listen({ port: env.PORT, ...ws.engine.handler() }, ({ url }) => {
		logger.info(`Server running on ${url}`);
	});

	const grpcPort = env.GRPC_PORT;
	await grpcServer.listen(`0.0.0.0:${grpcPort}`);
	logger.info(`gRPC Server running on 0.0.0.0:${grpcPort}`);
}
