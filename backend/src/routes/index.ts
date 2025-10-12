import { name, version } from "@/../package.json";
import { success } from "@/utils/response";

import { Elysia } from "elysia";
import auth from "./auth";
import lecturer from "./lecturer";
import student from "./student";

export default new Elysia()
	.get("/", () => success({ data: { name, version } }))
	.use(auth)
	.use(student)
	.use(lecturer);
