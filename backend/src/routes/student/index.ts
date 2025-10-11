import { addDBListener } from "@/db/listener";
import { students } from "@/db/schema";
import { AppWithServices } from "@/services";
import create from "./create";
import _delete from "./delete";
import pagination from "./pagination";
import update from "./update";

addDBListener(students, ["id"], async (event) => {
	console.log("Students table changed:", event);
});

export default (app: AppWithServices) =>
	app.group("/student", { detail: { tags: ["Students"] } }, (app) =>
		app.use(create).use(update).use(_delete).use(pagination)
	);
