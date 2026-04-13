import { createRouter } from "@api/plugins/system";
import pagination from "./pagination";
import toggle from "./toggle";

const labEnrollmentRoutes = createRouter({
	prefix: "/:labId/enrollment",
	tags: ["Lab Enrollment"],
})
	.use(pagination)
	.use(toggle);

export default labEnrollmentRoutes;
