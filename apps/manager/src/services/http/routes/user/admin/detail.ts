import { failure, success } from "@jawit/common";
import db from "@manager/db";
import caching from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { RequestWithId } from "@vlab/shared/schemas/common";

export default createRouter()
	.use(caching)
	.guard(
		{
			private: ["admin"],
			params: RequestWithId(),
			cached: true,
		},
		(app) =>
			app
				.resolve(({ params: { id }, entity: { key } }) => ({
					cacheKey: `${key}:${id}`,
				}))
				.get("/:id", async ({ params: { id }, status, entity: { label } }) => {
					const admin = await db.query.users.findFirst({
						columns: { passwordHash: false },
						where: (u, { eq, and }) => and(eq(u.id, id), eq(u.role, "admin")),
					});

					if (admin) return success({ data: admin });
					else return status(404, failure({ message: `${label} not found` }));
				}),
	);
