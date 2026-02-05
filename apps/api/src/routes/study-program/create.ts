import db from "@api/db";
import { studyPrograms } from "@api/db/schema/auth";
import auth from "@api/middlewares/auth";
import { cache } from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import { success } from "@jawit/common";
import { CreateStudyProgramRequest } from "@vlab/shared/schemas/study-program";

export default createRouter()
	.use(auth)
	.post(
		"/",
		async ({ body, entity: { label, key } }) => {
			const [{ id }] = await db
				.insert(studyPrograms)
				.values(body)
				.returning({ id: studyPrograms.id });
			await cache.delete(`${key}:pagination:*`);

			return success({ message: `${label} created`, data: { id } });
		},
		{ private: ["admin"], body: CreateStudyProgramRequest },
	);
