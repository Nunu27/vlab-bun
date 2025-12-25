import logger from "@backend/services/logger";
import { storageCleanup } from "@backend/services/storage";
import { cron, Patterns } from "@elysiajs/cron";
import cluster from "cluster";
import { Elysia } from "elysia";

import view from "./view";

const fileRouter = new Elysia({
	detail: { tags: ["File"] }
})
	.use(
		cron({
			name: "file-cleanup",
			run: storageCleanup,
			paused: cluster.isWorker,
			pattern: Patterns.everyMinutes(15),
			catch: (error) => {
				logger.error({ error }, "File cleanup task failed");
			}
		})
	)
	.use(view);

export default fileRouter;
