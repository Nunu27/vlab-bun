import { Elysia } from "elysia";
import create from "./create";
import _delete from "./delete";
import detail from "./detail";
import pagination from "./pagination";
import update from "./update";
import cron from "./cron";
import session from "./session";

const labRouter = new Elysia({
	detail: { tags: ["Lab"] }
})
	.use(cron)
	.use(create)
	.use(detail)
	.use(update)
	.use(_delete)
	.use(pagination)
	.use(session);

export default labRouter;
