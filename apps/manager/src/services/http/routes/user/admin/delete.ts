import { failure, success } from "@jawit/common";
import db from "@manager/db";
import { users } from "@manager/db/schema/auth";
import auth, { sessions } from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { and, eq } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.delete(
		"/:id",
		async ({ session, params: { id }, status, entity: { label, key } }) => {
			if (id === session.data.id) {
				return status(400, failure({ message: "You cannot delete yourself" }));
			}

			const { rowCount } = await db
				.delete(users)
				.where(and(eq(users.id, id), eq(users.role, "admin")));

			if (rowCount) {
				await cache.delete(`${key}:pagination:*`, `${key}:${id}`, `me:${id}`);
				await sessions.delete(id);

				return success({ message: `${label} deleted` });
			} else return status(404, failure({ message: `${label} not found` }));
		},
		{
			private: ["admin"],
			params: RequestWithId(),
		},
	);
