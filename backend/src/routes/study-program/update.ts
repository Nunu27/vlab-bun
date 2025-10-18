import { studyPrograms } from "@/db/schema";
import { AppWithServices } from "@/plugins/services";
import { eq } from "drizzle-orm";
import { t } from "elysia";

const UpdateStudyProgramRequest = t.Object({
	name: t.String(),
	departmentId: t.String({ format: "uuid" })
});

export default (app: AppWithServices) =>
	app.put(
		"/:id",
		async ({ params, body, db }) => {
			const { id } = params;

			await db.update(studyPrograms).set(body).where(eq(studyPrograms.id, id));

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
