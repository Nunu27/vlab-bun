import { name, version } from "@/../package.json";
import db from "@/db";
import env from "@/env";
import caching from "@/middlewares/caching";
import session from "@/middlewares/session";
import logger from "@/services/logger";
import redis from "@/services/redis";
import { failure } from "@/utils/response";
import { wrap } from "@bogeychan/elysia-logger";
import openapi from "@elysiajs/openapi";
import { Elysia, ValidationError } from "elysia";
import { TUnionEnum } from "elysia/dist/type-system/types";

const inProduction = env.NODE_ENV === "production";

const formatError = (
	error: ValidationError["valueError"]
): { path: string; message: string }[] => {
	if (!error) return [];
	let { errors, path, message, type, schema } = error;

	if (errors.length) {
		return errors.flatMap((err) => {
			const error = err.First();

			return formatError(error);
		});
	}

	if (type === 31) {
		message = `Expected one of the following values ${(
			schema as TUnionEnum
		).enum
			.map((v) => JSON.stringify(v))
			.join(", ")}`;
	}

	return [{ path, message }];
};

const services = new Elysia({ name: "services" })
	.use(
		wrap(logger, {
			autoLogging: false
		})
	)
	.use(
		openapi({
			enabled: !inProduction,
			scalar: {
				showToolbar: "never"
			},
			documentation: {
				info: { title: name, version }
			}
		})
	)
	.onError(({ code, error, path }) => {
		switch (code) {
			case "VALIDATION":
				return failure({
					message: "Validation error",
					errors: error.all.flatMap((e) =>
						formatError(e as ValidationError["valueError"])
					)
				});
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
