import { success } from "@jawit/common";
import db from "@manager/db";
import { studyPrograms } from "@manager/db/schema/auth";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";
import { CreateStudyProgramRequest } from "@vlab/shared/schemas/study-program";

export default createRouter()
	.use(auth)
	.post(
		"/",
		async ({ body, entity: { label } }) => {
			const [{ id }] = await db
				.insert(studyPrograms)
				.values(body)
				.returning({ id: studyPrograms.id });

			return success({ message: `${label} created`, data: { id } });
		},
		{ private: ["admin"], body: CreateStudyProgramRequest },
	);
