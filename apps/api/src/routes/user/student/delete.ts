import db from "@api/db";
import { users } from "@api/db/schema/auth";
import auth, { sessions } from "@api/middlewares/auth";
import { cache } from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import { failure, success } from "@jawit/common";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { and, eq } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.delete(
		"/:id",
		async ({ params: { id }, status, entity: { label, key } }) => {
			const { rowCount } = await db
				.delete(users)
				.where(and(eq(users.id, id), eq(users.role, "student")));

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
