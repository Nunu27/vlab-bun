import { studyPrograms } from "@backend/db/schema/auth";
import { createRouter } from "@backend/plugins/services";
import { success } from "@backend/utils/response";
import { eq } from "drizzle-orm";

export default createRouter().delete(
	"/:id",
	async ({ params, db }) => {
		const { id } = params;

		await db.delete(studyPrograms).where(eq(studyPrograms.id, id));

		return success({ message: "Study program deleted" });
	},
	{
		private: ["admin"],
		detail: {
			description: "Delete a study program"
		}
	}
);
