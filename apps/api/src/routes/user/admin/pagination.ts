import db from "@api/db";
import caching from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import { md5 } from "@api/utils/hash";
import { success } from "@jawit/common";
import { createPaginator } from "@jawit/paginator";

const { paginate, schema } = createPaginator(db, "users", {
	usableColumns: ["id", "name", "email", "createdAt", "updatedAt"],
	searchableColumns: ["name", "email"],
});

export default createRouter()
	.use(caching)
	.guard(
		{
			private: ["admin"],
			query: schema,
			cached: true,
		},
		(app) =>
			app
				.resolve(({ query, entity: { key } }) => ({
					cacheKey: `${key}:pagination:${md5(query)}`,
				}))
				.get("/pagination", async ({ query }) => {
					const data = await paginate(query, {
						where: (users, { eq }) => eq(users.role, "admin"),
						columns: { passwordHash: false, role: false },
					});

					return success({ data });
				}),
	);
