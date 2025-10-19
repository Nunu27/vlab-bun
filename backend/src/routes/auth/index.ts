import { addDBListener } from "@/db/listener";
import { deleteCache } from "@/middlewares/caching";
import { Elysia } from "elysia";

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
	.use(login)
	.use(logout)
	.use(changePassword)
	.use(me);

export default authRouter;
export type AuthRouter = typeof authRouter;
