import { addDBListener } from "@/db/listener";
import { deleteCache } from "@/middlewares/caching";
import { Elysia } from "elysia";
import create from "./create";
import _delete from "./delete";
import detail from "./detail";
import list from "./list";
import update from "./update";

addDBListener("studyPrograms", ["id"], async ({ op, data }) => {
	const keys = ["study-program:list"];

	if (op !== "INSERT") {
		keys.push(`study-program:${data.id}`);
	}

	await deleteCache(...keys);
});

export default new Elysia({
	prefix: "/study-program",
	detail: { tags: ["Study Programs"] }
})
	.use(create)
	.use(detail)
	.use(update)
	.use(_delete)
	.use(list);
