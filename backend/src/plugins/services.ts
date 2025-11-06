import { name, version } from "@backend/../package.json";
import db from "@backend/db";
import { inProduction } from "@backend/env";
import caching from "@backend/middlewares/caching";
import session from "@backend/middlewares/session";
import logger from "@backend/services/logger";
import redis from "@backend/services/redis";
import { failure } from "@backend/utils/response";
import { wrap } from "@bogeychan/elysia-logger";
import openapi from "@elysiajs/openapi";
import { file } from "bun";
import { Elysia, type ElysiaConfig, ValidationError } from "elysia";
import { helmet } from "elysia-helmet";
import type { TUnionEnum } from "elysia/type-system/types";

const formatError = (
	error: ValidationError["valueError"]
): { path: string; message: string }[] => {
	if (!error) return [];
	let { errors, path, message, type, schema } = error;

	if (errors.length) {
		if (type === 62) {
			const allMemberErrors = errors.map((err) => {
				const error = err.First();
				return formatError(error);
			});

			const leastErrors = allMemberErrors.reduce((min, current) => {
				return current.length < min.length ? current : min;
			}, allMemberErrors[0] || []);

			return leastErrors;
		}

		return errors.flatMap((err) => {
			const error = err.First();
			return formatError(error);
		});
	}

	if (type === 31) {
		message = `Expected one of the following values ${(
			schema as TUnionEnum
		).enum
			.map((v: unknown) => JSON.stringify(v))
			.join(", ")}`;
	}

	return [{ path, message }];
};

const services = new Elysia({ name: "services" })
	.use(helmet({ contentSecurityPolicy: inProduction ? undefined : false }))
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
	.all("*", ({ status }) => status(200, file("public/index.html")))
	.all("/api/*", ({ status }) =>
		status(404, failure({ message: "Resource not found" }))
	)
	.onError(({ code, error, status, path }) => {
		switch (code) {
			case "VALIDATION":
				return status(
					422,
					failure({
						message: "Validation error",
						errors: error.all.flatMap((e) =>
							formatError(e as ValidationError["valueError"])
						)
					})
				);

			default:
				logger.error({ error }, path);
				return status(
					500,
					failure({
						message: inProduction ? "Internal server error" : error.toString()
					})
				);
		}
	})
	.decorate("redis", redis)
	.decorate("db", db)
	.use(session)
	.use(caching)
	.as("global");

export default services;
export const createRouter = <Prefix extends string = "">(
	config?: ElysiaConfig<Prefix>
) => new Elysia(config).use(services);
