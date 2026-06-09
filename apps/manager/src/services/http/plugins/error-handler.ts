import { failure } from "@jawit/common";
import { inProduction } from "@manager/env";
import logger from "@manager/lib/logger";
import {
	formatDBError,
	formatValidationError,
} from "@manager/utils/error-formatter";
import { DrizzleError, DrizzleQueryError } from "drizzle-orm";
import { Elysia } from "elysia";
import { DatabaseError } from "pg";

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

			case "DrizzleError":
				logger.error({ error: error.cause }, error.message);

				return status(
					500,
					failure({
						message: inProduction ? "Internal server error" : error.message,
					}),
				);

			case "DrizzleQueryError":
				if (error.cause instanceof DatabaseError) {
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
						message: inProduction ? "Internal server error" : error.toString(),
					}),
				);
		}
	})
	.as("global");

export default errorHandler;
