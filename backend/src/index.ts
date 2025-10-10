import env from "@/env";

import routes from "@/routes";
import services from "@/services";
import logger from "@/services/logger";
import { Elysia } from "elysia";
import { syncDBListeners } from "./db/listener";

await syncDBListeners();

new Elysia()
	.use(services)
	.use(routes)
	.listen(env.PORT, (app) => {
		logger.info(`Server running on http://${app.hostname}:${app.port}`);
	});
