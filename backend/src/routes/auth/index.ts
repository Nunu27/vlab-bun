import { addDBListener } from "@backend/db/listener";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";

import cas from "./cas";
import changePassword from "./change-password";
import login from "./login";
import logout from "./logout";
import me from "./me";

const authRouter = createRouter({
	detail: { tags: ["Authentication"] }
})
	.use(cas)
	.use(login)
	.use(logout)
	.use(changePassword)
	.use(me);

addDBListener(
	"users",
	["id"],
	async (event) => {
		await deleteCache(`me:${event.data.id}`);
	},
	{
		ops: ["UPDATE", "DELETE"]
	}
);

export default authRouter;
