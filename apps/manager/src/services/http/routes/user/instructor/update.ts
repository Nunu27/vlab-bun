import { failure, success } from "@jawit/common";
import db from "@manager/db";
import { instructors, users } from "@manager/db/schema/auth";
import auth from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { getAffectedCount } from "@manager/utils/db";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { UpdateInstructorRequest } from "@vlab/shared/schemas/instructor";
import { eq } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.put(
		"/:id",
		async ({ params: { id }, body, status, entity: { label, key } }) => {
			const updated = await db.transaction(async (tx) => {
				const uc = await getAffectedCount(
					tx.update(users).set(body).where(eq(users.id, id)).$dynamic(),
				);
				if (!uc) return false;

				await tx.update(instructors).set(body).where(eq(instructors.id, id));

				return true;
			});

			if (updated) {
				await cache.delete(`${key}:pagination:*`, `${key}:${id}`);

				return success({ message: `${label} updated` });
			} else return status(404, failure({ message: `${label} not found` }));
		},
		{
			private: ["admin"],
			params: RequestWithId(),
			body: UpdateInstructorRequest,
		},
	);
