import { addDBListener } from "@backend/db/listener";
import { deleteCache } from "@backend/middlewares/caching";
import { Elysia } from "elysia";

import adminRouter from "./admin";
import changePassword from "./change-password";
import lecturerRouter from "./lecturer";
import studentRouter from "./student";

addDBListener("users", ["id", "role"], async ({ op, data }) => {
	console.log(op, data);
	const keys = [`${data.role}:pagination:*`];

	if (op !== "INSERT") {
		keys.push(`${data.role}:${data.id}`);
	}

	console.log(keys);

	try {
		await deleteCache(...keys);
	} catch (error) {
		console.error("Error deleting cache for user changes:", error);
	}
});

const userRouter = new Elysia({
	detail: { tags: ["Users"] }
})
	.use(changePassword)
	.group("/student", (app) => app.use(studentRouter))
	.group("/lecturer", (app) => app.use(lecturerRouter))
	.group("/admin", (app) => app.use(adminRouter));

export default userRouter;
