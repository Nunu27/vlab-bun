import env from "@/env";

import { syncDBListeners } from "@/db/listener";
import { clearCache } from "@/middlewares/caching";
import logger from "@/services/logger";
import { Elysia } from "elysia";

import services from "@/plugins/services";
import routes from "@/routes";

await syncDBListeners();
await clearCache();

new Elysia()
	.use(services)
	.use(routes)
	.listen(env.PORT, (app) => {
		logger.info(`Server running on ${app.url.origin}`);
	});
