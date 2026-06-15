import { failure, success } from "@jawit/common";
import db from "@manager/db";
import { departments } from "@manager/db/schema/auth";
import auth from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { getAffectedCount } from "@manager/utils/db";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { UpdateDepartmentRequest } from "@vlab/shared/schemas/department";
import { eq } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.put(
		"/:id",
		async ({ params: { id }, body, status, entity: { key, label } }) => {
			const relatedStudyPrograms = await db.query.studyPrograms.findMany({
				where: (sp, { eq }) => eq(sp.departmentId, id),
				columns: { id: true },
			});

			const rowCount = await getAffectedCount(
				db
					.update(departments)
					.set(body)
					.where(eq(departments.id, id))
					.$dynamic(),
			);

			if (rowCount) {
				const studyProgramKeys = relatedStudyPrograms.map(
					(sp) => `study-program:${sp.id}`,
				);

				await cache.delete(
					`${key}:pagination:*`,
					`${key}:${id}`,
					"study-program:pagination:*",
					...studyProgramKeys,
				);

				return success({ message: `${label} updated` });
			} else return status(404, failure({ message: `${label} not found` }));
		},
		{
			private: ["admin"],
			params: RequestWithId(),
			body: UpdateDepartmentRequest,
		},
	);
