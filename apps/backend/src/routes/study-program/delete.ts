import { studyPrograms } from "@backend/db/schema/auth";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { failure, success } from "@backend/utils/response";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { eq } from "drizzle-orm";

export default createRouter().delete(
	"/:id",
	async ({ params, db, status }) => {
		const { id } = params;

		const { rowCount } = await db
			.delete(studyPrograms)
			.where(eq(studyPrograms.id, id));
		if (!rowCount) {
			return status(404, failure({ message: "Study program not found" }));
		}

		await deleteCache("study-program:pagination:*", `study-program:${id}`);

		return success({ message: "Study program deleted" });
	},
	{
		private: ["admin"],
		params: RequestWithId,
		detail: {
			description: "Delete a study program"
		}
	}
);
