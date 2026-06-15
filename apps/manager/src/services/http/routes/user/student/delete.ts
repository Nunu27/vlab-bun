import { failure, success } from "@jawit/common";
import db from "@manager/db";
import { users } from "@manager/db/schema/auth";
import auth, { sessions } from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { getAffectedCount } from "@manager/utils/db";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { and, eq } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.delete(
		"/:id",
		async ({ params: { id }, status, entity: { label, key } }) => {
			const relatedEnrollments = await db.query.labEnrollments.findMany({
				where: (e, { eq }) => eq(e.studentId, id),
				columns: { labId: true },
			});

			const rowCount = await getAffectedCount(
				db
					.delete(users)
					.where(and(eq(users.id, id), eq(users.role, "student")))
					.$dynamic(),
			);

			if (rowCount) {
				const enrollmentKeys = relatedEnrollments.map(
					(e) => `lab:${e.labId}:enrollment:pagination:*`,
				);

				await cache.delete(
					`${key}:pagination:*`,
					`${key}:${id}`,
					`me:${id}`,
					...enrollmentKeys,
				);
				await sessions.delete(id);

				return success({ message: `${label} deleted` });
			} else return status(404, failure({ message: `${label} not found` }));
		},
		{
			private: ["admin"],
			params: RequestWithId(),
		},
	);
