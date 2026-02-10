import { name, version } from "@api/../package.json";
import Elysia from "elysia";

import auth from "./auth";
import dashboard from "./dashboard";
import department from "./department";
import deviceCategory from "./device-category";
import deviceTemplate from "./device-template";
import evaluator from "./evaluator";
import file from "./file";
import lab from "./lab";
import studyProgram from "./study-program";
import user from "./user";

export default new Elysia({ prefix: "/api" })
	.get("/", () => ({ name, version }))
	.use(auth)
	.use(dashboard)
	.use(lab)
	.use(department)
	.use(studyProgram)
	.use(user)
	.use(deviceCategory)
	.use(deviceTemplate)
	.use(evaluator)
	.use(file);
