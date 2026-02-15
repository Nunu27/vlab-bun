import { createRouter } from "@api/plugins/system";

import "./cron";
import upload from "./upload";
import view from "./view";

const fileRoutes = createRouter({
	prefix: "/file",
	detail: { tags: ["File"] },
})
	.use(upload)
	.use(view);

export default fileRoutes;
