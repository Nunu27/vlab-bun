import { createRouter } from "@manager/services/http/plugins/system";

import adminRoutes from "./admin";
import changePassword from "./change-password";
import instructorRoutes from "./instructor";
import studentRoutes from "./student";

const userRoutes = createRouter({
	prefix: "/user",
	detail: { tags: ["User"] },
})
	.use(changePassword)
	.use(studentRoutes)
	.use(instructorRoutes)
	.use(adminRoutes);

export default userRoutes;
