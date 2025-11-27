import { Elysia } from "elysia";

import create from "./create";
import _delete from "./delete";
import detail from "./detail";
import pagination from "./pagination";
import update from "./update";

const deviceCategoryRouter = new Elysia({
	detail: { tags: ["Device Category"] }
})
	.use(create)
	.use(detail)
	.use(update)
	.use(_delete)
	.use(pagination);

export default deviceCategoryRouter;
