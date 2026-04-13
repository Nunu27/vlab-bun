import { createRouter } from "@api/plugins/system";

import admin from "./admin";
import instructor from "./instructor";
import student from "./student";

export default createRouter({ prefix: "/dashboard", tags: ["Dashboard"] })
	.use(admin)
	.use(instructor)
	.use(student);
