import { createRouter } from "@api/plugins/system";

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
