import { inProduction } from "@backend/env";
import logger from "@backend/services/logger";
import { formatError } from "@backend/utils/error-formatter";
import { failure } from "@backend/utils/response";
import { Elysia, type ValidationError } from "elysia";

const errorHandler = new Elysia({ name: "error-handler" }).onError(
	({ code, error, status, path }) => {
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
	}
);

export default errorHandler;
