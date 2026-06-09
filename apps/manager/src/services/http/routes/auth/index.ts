import { createRouter } from "@manager/services/http/plugins/system";

import cas from "./cas";
import changePassword from "./change-password";
import login from "./login";
import logout from "./logout";
import me from "./me";

const authRoutes = createRouter({
	prefix: "/auth",
	detail: { tags: ["Authentication"] },
})
	.use(cas)
	.use(login)
	.use(logout)
	.use(changePassword)
	.use(me);

export default authRoutes;
