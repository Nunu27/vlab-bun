import { failure, success } from "@jawit/common";
import db from "@manager/db";
import { students, users } from "@manager/db/schema/auth";
import auth from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { getAffectedCount } from "@manager/utils/db";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { UpdateStudentRequest } from "@vlab/shared/schemas/student";
import { eq } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.put(
		"/:id",
		async ({ params: { id }, body, status, entity: { label, key } }) => {
			const relatedEnrollments = await db.query.labEnrollments.findMany({
				where: (e, { eq }) => eq(e.studentId, id),
				columns: { labId: true },
			});

			const updated = await db.transaction(async (tx) => {
				const uc = await getAffectedCount(
					tx.update(users).set(body).where(eq(users.id, id)).$dynamic(),
				);
				if (!uc) return false;

				await tx.update(students).set(body).where(eq(students.id, id));

				return true;
			});
			if (updated) {
				const enrollmentKeys = relatedEnrollments.map(
					(e) => `lab:${e.labId}:enrollment:pagination:*`,
				);

				await cache.delete(
					`${key}:pagination:*`,
					`${key}:${id}`,
					`me:${id}`,
					...enrollmentKeys,
				);

				return success({ message: `${label} updated` });
			} else return status(404, failure({ message: `${label} not found` }));
		},
		{
			private: ["admin"],
			params: RequestWithId(),
			body: UpdateStudentRequest,
		},
	);
