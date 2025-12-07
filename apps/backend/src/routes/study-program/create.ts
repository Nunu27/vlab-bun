import { studyPrograms } from "@backend/db/schema/auth";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { success } from "@backend/utils/response";
import { CreateStudyProgramRequest } from "@vlab/shared/schemas";

export default createRouter().post(
	"/",
	async ({ body, db }) => {
		const [studyProgram] = await db
			.insert(studyPrograms)
			.values(body)
			.returning({ id: studyPrograms.id });
		await deleteCache("study-program:pagination:*");

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
