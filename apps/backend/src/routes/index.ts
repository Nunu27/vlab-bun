import { name, version } from "@backend/../package.json";
import { success } from "@backend/utils/response";
import { Elysia } from "elysia";

import authRouter from "./auth";
import departmentRouter from "./department";
import deviceRouter from "./device";
import deviceCategoryRouter from "./device-category";
import fileRouter from "./file";
import studyProgramRouter from "./study-program";
import userRouter from "./user";

export default new Elysia({ prefix: "/api" })
	.get("/", () => success({ data: { name, version } }))

	// System
	.group("/auth", (app) => app.use(authRouter))
	.group("/file", (app) => app.use(fileRouter))
	.group("/department", (app) => app.use(departmentRouter))
	.group("/study-program", (app) => app.use(studyProgramRouter))
	.group("/user", (app) => app.use(userRouter))

	// Lab
	.group("/device-category", (app) => app.use(deviceCategoryRouter))
	.group("/device", (app) => app.use(deviceRouter));
