import db from "@api/db";
import { studyPrograms } from "@api/db/schema/auth";
import auth from "@api/middlewares/auth";
import { cache } from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import { failure, success } from "@jawit/common";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { UpdateStudyProgramRequest } from "@vlab/shared/schemas/study-program";
import { eq } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.put(
		"/:id",
		async ({ params: { id }, body, status, entity: { label, key } }) => {
			const { rowCount } = await db
				.update(studyPrograms)
				.set(body)
				.where(eq(studyPrograms.id, id));

			if (rowCount) {
				await cache.delete(`${key}:pagination:*`, `${key}:${id}`);

				return success({ message: `${label} updated` });
			} else return status(404, failure({ message: `${label} not found` }));
		},
		{
			private: ["admin"],
			params: RequestWithId(),
			body: UpdateStudyProgramRequest,
		},
	);
