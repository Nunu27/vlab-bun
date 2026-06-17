import { createRouter } from "@manager/services/http/plugins/system";
import list from "./list";
import toggle from "./toggle";

const labEnrollmentRoutes = createRouter({
	prefix: "/:labId/enrollment",
	detail: { tags: ["Lab Enrollment"] },
})
	.use(list)
	.use(toggle);

export default labEnrollmentRoutes;
