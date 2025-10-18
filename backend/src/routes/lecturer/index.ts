import { addDBListener } from "@/db/listener";
import { deleteCache } from "@/middlewares/caching";
import { Elysia } from "elysia";
import create from "./create";
import _delete from "./delete";
import detail from "./detail";
import pagination from "./pagination";
import update from "./update";

addDBListener("lecturers", ["id"], async ({ op, data }) => {
	const keys = ["lecturer:pagination:*"];

	if (op !== "INSERT") {
		keys.push(`lecturer:${data.id}`);
	}

	await deleteCache(...keys);
});

export default new Elysia({
	prefix: "/lecturer",
	detail: { tags: ["Lecturers"] }
})
	.use(create)
	.use(detail)
	.use(update)
	.use(_delete)
	.use(pagination);
