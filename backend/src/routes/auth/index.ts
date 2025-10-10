import { AppWithServices } from "@/services";
import login from "./login";
import logout from "./logout";
import me from "./me";
import { addDBListener } from "@/db/listener";
import { users } from "@/db/schema";

addDBListener(
	users,
	["id"],
	async (event) => {
		console.log(event);
	},
	{
		ops: ["UPDATE", "DELETE"]
	}
);

export default (app: AppWithServices) =>
	app.group("auth", { detail: { tags: ["Authentication"] } }, (app) =>
		app.use(login).use(logout).use(me)
	);
