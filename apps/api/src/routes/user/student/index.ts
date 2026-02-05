import { createRouter } from "@api/plugins/system";

import create from "./create";
import _delete from "./delete";
import detail from "./detail";
import pagination from "./pagination";
import update from "./update";

const studentRoutes = createRouter({
	prefix: "/student",
	detail: { tags: ["Student"] },
})
	.use(create)
	.use(detail)
	.use(update)
	.use(_delete)
	.use(pagination);

export default studentRoutes;
