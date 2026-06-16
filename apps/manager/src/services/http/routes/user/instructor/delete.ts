import { responses } from "@jawit/common";
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
		async ({ params: { id }, status, ENTITY: { LABEL: label } }) => {
			const relatedLabs = await db.query.labs.findMany({
				where: (l, { eq }) => eq(l.instructorId, id),
				columns: { id: true },
			});

			const rowCount = await getAffectedCount(
				db
					.delete(users)
					.where(and(eq(users.id, id), eq(users.role, "instructor")))
					.$dynamic(),
			);

			if (rowCount) {
				const labKeys = relatedLabs.flatMap((l) => [
					`lab:${l.id}`,
					`lab:${l.id}:*`,
				]);

				await cache.delete(`me:${id}`, ...labKeys);
				await sessions.delete(id);

				return responses.deleted(label);
			} else return status(404, responses.notFound(label));
		},
		{
			private: ["admin"],
			params: RequestWithId(),
		},
	);
