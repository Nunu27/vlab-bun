import { addDBListener } from "@/db/listener";
import { AppWithServices } from "@/services";
import create from "./create";
import _delete from "./delete";
import pagination from "./pagination";
import update from "./update";

addDBListener("lecturers", ["id"], async (event) => {
	console.log("Lecturers table changed:", event);
});

export default (app: AppWithServices) =>
	app.group("/lecturer", { detail: { tags: ["Lecturers"] } }, (app) =>
		app.use(create).use(update).use(_delete).use(pagination)
	);
