import { addDBListener } from "@/db/listener";
import { deleteCache } from "@/services/caching";
import { Elysia } from "elysia";
import create from "./create";
import _delete from "./delete";
import pagination from "./pagination";
import update from "./update";

addDBListener("students", ["id"], async ({ op, data }) => {
	const keys = ["student:pagination:*"];

	if (op !== "INSERT") {
		keys.push(`student:${data.id}`);
	}

	await deleteCache(...keys);
});

export default new Elysia({
	prefix: "/lecturer",
	detail: { tags: ["Lecturers"] }
})
	.use(create)
	.use(update)
	.use(_delete)
	.use(pagination);
