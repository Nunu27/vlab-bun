import { createRouter } from "@api/plugins/system";

import detail from "./detail";
import node from "./node";

import "./ws";

const sessionRouter = createRouter({
	prefix: "/:labId/session",
	tags: ["Lab Session"],
})
	.use(detail)
	.use(node);

export default sessionRouter;
