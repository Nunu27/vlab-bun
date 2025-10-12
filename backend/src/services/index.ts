import { name, version } from "@/../package.json";
import db from "@/db";
import env from "@/env";
import { failure } from "@/utils/response";
import { wrap } from "@bogeychan/elysia-logger";
import openapi from "@elysiajs/openapi";
import { Elysia } from "elysia";
import caching from "./caching";
import logger from "./logger";
import redis from "./redis";
import session from "./session";

const inProduction = env.NODE_ENV === "production";

const services = new Elysia()
	.use(
		wrap(logger, {
			autoLogging: false
		})
	)
	.use(
		openapi({
			enabled: !inProduction,
			documentation: {
				info: { title: name, version }
			}
		})
	)
	.onError(({ code, error, path }) => {
		switch (code) {
			case "VALIDATION":
				return failure({ message: "Validation error", errors: error.all });
			case "NOT_FOUND":
				return failure({ message: "Resource not found" });

			default:
				logger.error(error, path);
				return failure({
					message: inProduction ? "Internal server error" : error.toString()
				});
		}
	})
	.decorate("redis", redis)
	.decorate("db", db)
	.use(session)
	.use(caching)
	.as("global");

export default services;
export type AppWithServices = typeof services;
