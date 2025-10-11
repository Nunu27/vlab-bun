import { name, version } from "@/../package.json";
import { AppWithServices } from "@/services";
import { success } from "@/utils/response";

import auth from "./auth";
import lecturer from "./lecturer";
import student from "./student";

export default (app: AppWithServices) =>
	app
		.get("/", () => success({ data: { name, version } }))
		.use(auth)
		.use(student)
		.use(lecturer);
