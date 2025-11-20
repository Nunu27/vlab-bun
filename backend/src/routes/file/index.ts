import { storageCleanup } from "@backend/services/storage";
import { cron, Patterns } from "@elysiajs/cron";
import { Elysia } from "elysia";

import _delete from "./delete";
import view from "./view";

const fileRouter = new Elysia({
	detail: { tags: ["File"] }
})
	.use(
		cron({
			catch: true,
			name: "file-cleanup",
			pattern: Patterns.everyMinutes(15),
			run: storageCleanup
		})
	)
	.use(view)
	.use(_delete);

export default fileRouter;
