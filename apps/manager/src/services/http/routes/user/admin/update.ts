import { failure, success } from "@jawit/common";
import db from "@manager/db";
import { users } from "@manager/db/schema/auth";
import auth from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { getAffectedCount } from "@manager/utils/db";
import { UpdateAdminRequest } from "@vlab/shared/schemas/admin";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { eq } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.put(
		"/:id",
		async ({ params: { id }, body, status, entity: { label, key } }) => {
			const rowCount = await getAffectedCount(
				db.update(users).set(body).where(eq(users.id, id)).$dynamic(),
			);
			if (rowCount) {
				await cache.delete(`${key}:pagination:*`, `${key}:${id}`, `me:${id}`);

				return success({ message: `${label} updated` });
			} else return status(404, failure({ message: `${label} not found` }));
		},
		{
			private: ["admin"],
			params: RequestWithId(),
			body: UpdateAdminRequest,
		},
	);
