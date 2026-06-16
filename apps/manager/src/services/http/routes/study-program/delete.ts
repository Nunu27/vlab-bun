import { responses } from "@jawit/common";
import db from "@manager/db";
import { studyPrograms } from "@manager/db/schema/auth";
import auth from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { getAffectedCount } from "@manager/utils/db";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { eq } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.delete(
		"/:id",
		async ({ params: { id }, status, ENTITY: { LABEL: label } }) => {
			const relatedStudents = await db.query.students.findMany({
				where: (s, { eq }) => eq(s.studyProgramId, id),
				columns: { id: true },
			});

			const rowCount = await getAffectedCount(
				db.delete(studyPrograms).where(eq(studyPrograms.id, id)).$dynamic(),
			);

			if (rowCount) {
				if (relatedStudents.length > 0) {
					const studentKeys = relatedStudents.map((s) => `me:${s.id}`);
					await cache.delete(...studentKeys);
				}

				return responses.deleted(label);
			} else return status(404, responses.notFound(label));
		},
		{
			private: ["admin"],
			params: RequestWithId(),
		},
	);
