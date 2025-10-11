import { AppWithServices } from "@/services";

export default (app: AppWithServices) =>
	app.group("/lab", { detail: { tags: ["Labs"] } }, (app) => app);
