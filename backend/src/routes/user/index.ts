import { createRouter } from "@backend/plugins/services";

import adminRouter from "./admin";
import changePassword from "./change-password";
import lecturerRouter from "./lecturer";
import studentRouter from "./student";

const userRouter = createRouter({
	detail: { tags: ["Users"] }
})
	.use(changePassword)
	.group("/student", (app) => app.use(studentRouter))
	.group("/lecturer", (app) => app.use(lecturerRouter))
	.group("/admin", (app) => app.use(adminRouter));

export default userRouter;
