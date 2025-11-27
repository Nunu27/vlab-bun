import { Elysia } from "elysia";

import create from "./create";
import _delete from "./delete";
import detail from "./detail";
import list from "./list";
import pagination from "./pagination";
import update from "./update";

const deviceRouter = new Elysia({
	detail: { tags: ["Device"] }
})
	.use(create)
	.use(detail)
	.use(update)
	.use(_delete)
	.use(pagination)
	.use(list);

export default deviceRouter;
