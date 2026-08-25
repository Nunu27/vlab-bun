import { createRouter } from "@manager/services/http/plugins/system";

import create from "./create";
import _delete from "./delete";
import detail from "./detail";
import duplicate from "./duplicate";
import labEnrollmentRoutes from "./enrollment";
import pagination from "./pagination";
import labSessionRoutes from "./session";
import update from "./update";

const labRoutes = createRouter({
	prefix: "/lab",
	detail: { tags: ["Lab"] },
})
	.use(create)
	.use(detail)
	.use(update)
	.use(_delete)
	.use(duplicate)
	.use(pagination)
	.use(labEnrollmentRoutes)
	.use(labSessionRoutes);

export default labRoutes;
