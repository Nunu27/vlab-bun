import { studyPrograms } from "@/db/schema/auth";
import { AppWithServices } from "@/plugins/services";
import { success } from "@/utils/response";
import { t } from "elysia";

const CreateStudyProgramRequest = t.Object({
	name: t.String(),
	departmentId: t.String({ format: "uuid" })
});

export default (app: AppWithServices) =>
	app.post(
		"/",
		async ({ body, db }) => {
			const [studyProgram] = await db
				.insert(studyPrograms)
				.values(body)
				.returning({ id: studyPrograms.id });

			return success({
				message: "Study program created",
				data: { id: studyProgram.id }
			});
		},
		{
			private: ["admin"],
			body: CreateStudyProgramRequest,
			detail: {
				description: "Create a new study program"
			}
		}
	);
