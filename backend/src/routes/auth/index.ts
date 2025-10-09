import { App } from "../../services";
import login from "./login";
import logout from "./logout";

export default (app: App) =>
	app.group("auth", { detail: { tags: ["Authentication"] } }, (app) =>
		app.use(login).use(logout)
	);
