import { createRouter } from "@api/plugins/system";

import create from "./create";
import _delete from "./delete";
import detail from "./detail";
import list from "./list";
import pagination from "./pagination";
import update from "./update";

import "./ws";

const deviceTemplateRoutes = createRouter({
	prefix: "/device-template",
	detail: { tags: ["Device Template"] },
})
	.use(create)
	.use(detail)
	.use(update)
	.use(_delete)
	.use(list)
	.use(pagination);

export default deviceTemplateRoutes;
