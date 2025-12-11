import { studyPrograms } from "@backend/db/schema/auth";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { eq } from "drizzle-orm";
import { RequestWithId } from "../schema";
import { UpdateStudyProgramRequest } from "@vlab/shared/schemas";
import { failure } from "@backend/utils/response";

export default createRouter().put(
	"/:id",
	async ({ params, body, db, status }) => {
		const { id } = params;

		const { rowCount } = await db
			.update(studyPrograms)
			.set(body)
			.where(eq(studyPrograms.id, id));
		if (!rowCount) {
			return status(404, failure({ message: "Study program not found" }));
		}
		await deleteCache("study-program:pagination:*", `study-program:${id}`);

		return { message: "Study program updated" };
	},
	{
		private: ["admin"],
		params: RequestWithId,
		body: UpdateStudyProgramRequest,
		detail: {
			description: "Update a study program"
		}
	}
);
