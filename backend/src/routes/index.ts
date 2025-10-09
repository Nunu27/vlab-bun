import { name, version } from "../../package.json";
import { success } from "../utils/response";
import { App } from "../services";
import auth from "./auth";

export default (app: App) =>
	app.get("/", () => success({ data: { name, version } })).use(auth);
