import { createRouter } from "@manager/services/http/plugins/system";

import detail from "./detail";
import list from "./list";
import node from "./node";

import "./cron";

const labSessionRoutes = createRouter({
	prefix: "/:labId/session",
	tags: ["Lab Session"],
})
	.use(detail)
	.use(list)
	.use(node);

export default labSessionRoutes;
