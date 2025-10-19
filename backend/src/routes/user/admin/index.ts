import { Elysia } from "elysia";
import create from "./create";
import _delete from "./delete";
import detail from "./detail";
import pagination from "./pagination";
import update from "./update";

const adminRouter = new Elysia({
	detail: { tags: ["Admins"] }
})
	.use(create)
	.use(detail)
	.use(update)
	.use(_delete)
	.use(pagination);

export default adminRouter;
export type AdminRouter = typeof adminRouter;
