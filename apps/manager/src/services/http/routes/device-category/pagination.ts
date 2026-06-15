import { success } from "@jawit/common";
import { createPaginator } from "@jawit/paginator";
import db from "@manager/db";
import caching from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { md5 } from "@manager/utils/hash";

const { paginate, schema } = createPaginator(db, "deviceCategories", {
	searchableColumns: ["name"],
	usableColumns: ["name", "color", "createdAt", "updatedAt"],
});

export default createRouter()
	.use(caching)
	.guard(
		{
			private: ["admin"],
			body: schema,
			cached: true,
		},
		(app) => {
			return app
				.resolve(({ body, entity: { key }, cache }) =>
					cache.set(`${key}:pagination:${md5(body)}`),
				)
				.post("/pagination", async ({ body }) => {
					const data = await paginate(body, {
						columns: {
							createdAt: false,
							updatedAt: false,
						},
					});

					return success({ data });
				});
		},
	);
