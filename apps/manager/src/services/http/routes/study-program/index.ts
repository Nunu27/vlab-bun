import { createRouter } from "@manager/services/http/plugins/system";

import create from "./create";
import _delete from "./delete";
import detail from "./detail";
import pagination from "./pagination";
import update from "./update";

const studyProgramRoutes = createRouter({
	prefix: "/study-program",
	detail: { tags: ["Study Program"] },
})
	.use(create)
	.use(detail)
	.use(update)
	.use(_delete)
	.use(pagination);

export default studyProgramRoutes;
