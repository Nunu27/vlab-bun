import { addDBListener } from "@backend/db/listener";
import { deleteCache } from "@backend/middlewares/caching";
import { Elysia } from "elysia";

import cas from "./cas";
import changePassword from "./change-password";
import login from "./login";
import logout from "./logout";
import me from "./me";

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

const authRouter = new Elysia({
	detail: { tags: ["Authentication"] }
})
	.use(cas)
	.use(login)
	.use(logout)
	.use(changePassword)
	.use(me);

export default authRouter;
