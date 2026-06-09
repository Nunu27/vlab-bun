import { createRouter } from "@manager/services/http/plugins/system";

import create from "./create";
import _delete from "./delete";
import detail from "./detail";
import pagination from "./pagination";
import update from "./update";

const departmentRoutes = createRouter({
	prefix: "/department",
	detail: { tags: ["Department"] },
})
	.use(create)
	.use(detail)
	.use(update)
	.use(_delete)
	.use(pagination);

export default departmentRoutes;
