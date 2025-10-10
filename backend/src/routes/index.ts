import { name, version } from "@/../package.json";
import { AppWithServices } from "@/services";
import { success } from "@/utils/response";
import auth from "./auth";

export default (app: AppWithServices) =>
	app.get("/", () => success({ data: { name, version } })).use(auth);
