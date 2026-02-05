import { createRouter } from "@api/plugins/system";
import { storageCleanup } from "@api/services/storage";
import { cron } from "@elysiajs/cron";

import upload from "./upload";
import view from "./view";

const fileRoutes = createRouter({
	prefix: "/file",
	detail: { tags: ["File"] },
})
	.use(
		cron({
			name: "storage-cleanup",
			pattern: "*/15 * * * *",
			run: storageCleanup,
		}),
	)
	.use(upload)
	.use(view);

export default fileRoutes;
