import { inProduction } from "@backend/env";
import logger from "@backend/services/logger";
import dbErrorHandler from "@backend/utils/db-error-handler";
import { formatError } from "@backend/utils/error-formatter";
import { failure } from "@backend/utils/response";
import { DrizzleError, DrizzleQueryError } from "drizzle-orm";
import { Elysia, type ValidationError } from "elysia";
import { DatabaseError } from "pg";

const errorHandler = new Elysia({ name: "error-handler" })
	.error({
		DrizzleQueryError,
		DrizzleError
	})
	.onError({ as: "global" }, ({ code, error, status, path }) => {
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

			case "DrizzleError":
				logger.error({ error: error.cause }, error.message);

				return status(
					500,
					failure({
						message: inProduction ? "Internal server error" : error.message
					})
				);

			case "DrizzleQueryError":
				if (error.cause instanceof DatabaseError && error.cause.code) {
					const key = error.cause.code as keyof typeof dbErrorHandler;
					const handler =
						error.cause.code in dbErrorHandler ? dbErrorHandler[key] : null;

					return (
						handler?.(error.cause) ??
						status(
							500,
							failure({
								message: inProduction ? "Internal server error" : error.message
							})
						)
					);
				}

				logger.error({ error: error.cause }, error.message);

				return status(
					500,
					failure({
						message: inProduction ? "Internal server error" : error.message
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
	});

export default errorHandler;
