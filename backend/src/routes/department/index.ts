import { addDBListener } from "@/db/listener";
import { deleteCache } from "@/middlewares/caching";
import { Elysia } from "elysia";

import create from "./create";
import _delete from "./delete";
import detail from "./detail";
import list from "./list";
import update from "./update";

addDBListener("departments", ["id"], async ({ op, data }) => {
	const keys = ["department:list"];

	if (op !== "INSERT") {
		keys.push(`department:${data.id}`);
	}

	await deleteCache(...keys);
});

const departmentRouter = new Elysia({
	detail: { tags: ["Department"] }
})
	.use(create)
	.use(detail)
	.use(update)
	.use(_delete)
	.use(list);

export default departmentRouter;
export type DepartmentRouter = typeof departmentRouter;
