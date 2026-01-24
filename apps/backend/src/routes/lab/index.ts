import { Elysia } from "elysia";

import create from "./create";
import cron from "./cron";
import _delete from "./delete";
import detail from "./detail";
import pagination from "./pagination";
import session from "./session";
import update from "./update";

const labRouter = new Elysia({
	detail: { tags: ["Lab"] }
})
	.use(cron)
	.use(create)
	.use(detail)
	.use(update)
	.use(_delete)
	.use(pagination)
	.group("/session", (app) => app.use(session));

export default labRouter;
