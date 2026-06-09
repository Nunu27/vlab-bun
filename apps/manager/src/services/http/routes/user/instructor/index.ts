import { createRouter } from "@manager/services/http/plugins/system";

import create from "./create";
import _delete from "./delete";
import detail from "./detail";
import pagination from "./pagination";
import update from "./update";

const instructorRoutes = createRouter({
	prefix: "/instructor",
	detail: { tags: ["Instructor"] },
})
	.use(create)
	.use(detail)
	.use(update)
	.use(_delete)
	.use(pagination);

export default instructorRoutes;
