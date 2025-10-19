import { addDBListener } from "@/db/listener";
import { deleteCache } from "@/middlewares/caching";
import { Elysia } from "elysia";
import adminRouter from "./admin";
import lecturerRouter from "./lecturer";
import studentRouter from "./student";
import changePassword from "./change-password";

addDBListener("users", ["id", "role"], async ({ op, data }) => {
	const keys = [`${data.role}:pagination:*`];

	if (op !== "INSERT") {
		keys.push(`${data.role}:${data.id}`);
	}

	await deleteCache(...keys);
});

const userRouter = new Elysia({
	detail: { tags: ["Users"] }
})
	.use(changePassword)
	.group("/student", (app) => app.use(studentRouter))
	.group("/lecturer", (app) => app.use(lecturerRouter))
	.group("/admin", (app) => app.use(adminRouter));

export default userRouter;
export type UserRouter = typeof userRouter;
