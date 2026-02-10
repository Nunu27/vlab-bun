import { createRouter } from "@api/plugins/system";
import ws from "@api/services/ws";

import detail from "./detail";
import node from "./node";

ws.server.on("lab:[id]:init", async ({ params: { id } }) => {
	// NOTE: data should not be available here
	console.log(id);
});

const sessionRouter = createRouter({
	prefix: "/:labId/session",
	tags: ["Lab Session"],
})
	.use(detail)
	.use(node);

export default sessionRouter;
