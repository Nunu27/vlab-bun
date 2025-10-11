import { name, version } from "@/../package.json";
import db from "@/db";
import { wrap } from "@bogeychan/elysia-logger";
import openapi from "@elysiajs/openapi";
import { Elysia } from "elysia";
import logger from "./logger";
import session from "./session";
import { failure } from "@/utils/response";
import env from "@/env";

const services = new Elysia()
	.use(wrap(logger, { autoLogging: false }))
	.use(
		openapi({
			documentation: {
				info: { title: name, version }
			}
		})
	)
	.onError(({ code, error, path }) => {
		if (code === "VALIDATION") {
			return failure({ message: "Validation error", errors: error.all });
		}

		logger.error(error, path);
		return failure({
			message:
				env.NODE_ENV === "development"
					? error.toString()
					: "Internal server error"
		});
	})
	.decorate("db", db)
	.use(session)
	.as("global");

export default services;
export type AppWithServices = typeof services;
