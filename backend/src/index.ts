import env from "@/env";

import { syncDBListeners } from "@/db/listener";
import routes from "@/routes";
import services from "@/plugins/services";
import { clearCache } from "@/middlewares/caching";
import logger from "@/services/logger";
import { Elysia } from "elysia";

await syncDBListeners();
await clearCache();

new Elysia()
	.use(services)
	.use(routes)
	.listen(env.PORT, (app) => {
		logger.info(`Server running on ${app.url.origin}`);
	});
