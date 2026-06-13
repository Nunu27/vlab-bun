import { createRouter } from "@manager/services/http/plugins/system";

import upload from "./upload";
import view from "./view";

const fileRoutes = createRouter({
	prefix: "/file",
	detail: { tags: ["File"] },
})
	.use(upload)
	.use(view);

export default fileRoutes;
