import env from "./env";

import { Elysia } from "elysia";
import services from "./services";
import logger from "./services/logger";
import routes from "./routes";
import openapi from "@elysiajs/openapi";

new Elysia()
	.use(openapi())
	.use(services)
	.use(routes)
	.listen(env.PORT, (app) => {
		logger.info(`Server running on http://${app.hostname}:${app.port}`);
	});
