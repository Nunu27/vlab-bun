import { addDBListener } from "@backend/db/listener";
import { deleteCache } from "@backend/middlewares/caching";
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

const studyProgramRouter = new Elysia({
	detail: { tags: ["Study Programs"] }
})
	.use(create)
	.use(detail)
	.use(update)
	.use(_delete)
	.use(list);

export default studyProgramRouter;
