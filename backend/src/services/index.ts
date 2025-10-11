import { name, version } from "@/../package.json";
import db from "@/db";
import env from "@/env";
import { failure } from "@/utils/response";
import { wrap } from "@bogeychan/elysia-logger";
import openapi from "@elysiajs/openapi";
import { Elysia } from "elysia";
import logger from "./logger";
import session from "./session";

const services = new Elysia()
	.use(wrap(logger, { autoLogging: false }))
	.use(
		openapi({
			enabled: env.NODE_ENV !== "production",
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
					message:
						env.NODE_ENV !== "production"
							? error.toString()
							: "Internal server error"
				});
		}
	})
	.decorate("db", db)
	.use(session)
	.as("global");

export default services;
export type AppWithServices = typeof services;
