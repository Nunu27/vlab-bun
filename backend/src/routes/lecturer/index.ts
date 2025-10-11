import { AppWithServices } from "@/services";

export default (app: AppWithServices) =>
	app.group("/lecturer", { detail: { tags: ["Lecturers"] } }, (app) => app);
