import { failure } from "@jawit/common";
import { inProduction } from "@manager/env";
import baseLogger from "@manager/lib/logger";
import {
	formatDBError,
	formatValidationError,
} from "@manager/utils/error-formatter";
import { SQL } from "bun";
import { DrizzleError, DrizzleQueryError } from "drizzle-orm";
import { Elysia } from "elysia";

const logger = baseLogger.child({ service: "http" });

const errorHandler = new Elysia({ name: "error-handler" })
	.error({
		DrizzleQueryError,
		DrizzleError,
	})
	.onError(({ code, error, status }) => {
		switch (code) {
			case "VALIDATION":
				if (!error.all) {
					return status(422, failure({ message: error.message }));
				}

				return status(
					422,
					failure({
						message: "Validation error",
						errors: formatValidationError(error),
					}),
				);

			case "NOT_FOUND":
				return status(404, failure({ message: "Resource not found" }));

			case "DrizzleError":
				logger.error({ error: error.cause }, error.message);

				return status(
					500,
					failure({
						message: inProduction ? "Internal server error" : error.message,
					}),
				);

			case "DrizzleQueryError":
				if (error.cause instanceof SQL.PostgresError) {
					const response = formatDBError(error.cause);
					if (response) return response;
				}

				logger.error({ error: error.cause }, error.message);

				return status(
					500,
					failure({
						message: inProduction ? "Internal server error" : error.message,
					}),
				);

			default:
				logger.error({ error }, "Unknown error");

				return status(
					500,
					failure({
						message: inProduction ? "Internal server error" : String(error),
					}),
				);
		}
	})
	.as("global");

export default errorHandler;
