import { studyPrograms } from "@/db/schema/auth";
import { AppWithServices } from "@/plugins/services";
import { success } from "@/utils/response";
import { eq } from "drizzle-orm";

export default (app: AppWithServices) =>
	app.delete(
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
