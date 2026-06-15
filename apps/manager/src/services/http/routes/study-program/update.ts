import { failure, success } from "@jawit/common";
import db from "@manager/db";
import { studyPrograms } from "@manager/db/schema/auth";
import auth from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { getAffectedCount } from "@manager/utils/db";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { UpdateStudyProgramRequest } from "@vlab/shared/schemas/study-program";
import { eq } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.put(
		"/:id",
		async ({ params: { id }, body, status, entity: { label, key } }) => {
			const relatedStudents = await db.query.students.findMany({
				where: (s, { eq }) => eq(s.studyProgramId, id),
				columns: { id: true },
			});

			const rowCount = await getAffectedCount(
				db
					.update(studyPrograms)
					.set(body)
					.where(eq(studyPrograms.id, id))
					.$dynamic(),
			);

			if (rowCount) {
				const studentKeys = relatedStudents.flatMap((s) => [
					`student:${s.id}`,
					`me:${s.id}`,
				]);

				await cache.delete(
					`${key}:pagination:*`,
					`${key}:${id}`,
					"student:pagination:*",
					...studentKeys,
				);

				return success({ message: `${label} updated` });
			} else return status(404, failure({ message: `${label} not found` }));
		},
		{
			private: ["admin"],
			params: RequestWithId(),
			body: UpdateStudyProgramRequest,
		},
	);
