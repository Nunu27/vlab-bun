import { AppWithServices } from "@/services";

export default (app: AppWithServices) =>
	app.group("student", { detail: { tags: ["Students"] } }, (app) => app);
