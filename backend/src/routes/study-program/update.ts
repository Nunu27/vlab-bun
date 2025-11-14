import { studyPrograms } from "@backend/db/schema/auth";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { eq } from "drizzle-orm";
import { UpdateStudyProgramRequest } from "./schema";

export default createRouter().put(
	"/:id",
	async ({ params, body, db }) => {
		const { id } = params;

		await db.update(studyPrograms).set(body).where(eq(studyPrograms.id, id));
		await deleteCache("study-program:pagination:*", `study-program:${id}`);

		return { message: "Study program updated" };
	},
	{
		private: ["admin"],
		body: UpdateStudyProgramRequest,
		detail: {
			description: "Update a study program"
		}
	}
);
