import { createRouter } from "@api/plugins/system";

import create from "./create";
import _delete from "./delete";
import detail from "./detail";
import enrollmentPagination from "./enrollment/pagination";
import pagination from "./pagination";
import session from "./session";
import update from "./update";

const labRoutes = createRouter({
	prefix: "/lab",
	detail: { tags: ["Lab"] },
})
	.use(create)
	.use(detail)
	.use(update)
	.use(_delete)
	.use(pagination)
	.use(enrollmentPagination)
	.use(session);

export default labRoutes;
