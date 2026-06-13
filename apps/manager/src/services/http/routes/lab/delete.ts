import { failure, success } from "@jawit/common";
import db from "@manager/db";
import { labs } from "@manager/db/schema/lab";
import auth from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { getAffectedCount } from "@manager/utils/db";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { and, eq } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.delete(
		"/:labId",
		async ({
			params: { labId: id },
			session,
			status,
			entity: { label, key },
		}) => {
			const deleted = await db.transaction(async (tx) => {
				const rowCount = await getAffectedCount(
					tx
						.delete(labs)
						.where(and(eq(labs.id, id), eq(labs.instructorId, session.data.id)))
						.$dynamic(),
				);

				if (!rowCount) return false;
				return true;
			});

			if (deleted) {
				await cache.delete(
					`${key}:pagination:*`,
					`${key}:${id}:*`,
					`${key}:${id}`,
				);

				return success({ message: `${label} deleted` });
			} else return status(404, failure({ message: `${label} not found` }));
		},
		{
			private: ["instructor"],
			params: RequestWithId(["labId"]),
		},
	);
