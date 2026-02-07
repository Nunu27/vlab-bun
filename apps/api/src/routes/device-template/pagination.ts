import db from "@api/db";
import caching from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import { md5 } from "@api/utils/hash";
import { success } from "@jawit/common";
import { createPaginator } from "@jawit/paginator";

const { paginate, schema } = createPaginator(db, "deviceTemplates", {
	searchableColumns: ["name"],
	usableColumns: ["name", "kind", "deviceCategoryId", "createdAt", "updatedAt"],
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
				.resolve(({ body, entity: { key } }) => ({
					cacheKey: `${key}:pagination:${md5(body)}`,
				}))
				.post("/pagination", async ({ body }) => {
					const data = await paginate(body, {
						columns: {
							deviceCategoryId: false,
							env: false,
							connection: false,
							interfaces: false,
							resources: false,
							createdAt: false,
							updatedAt: false,
						},
						with: { category: { columns: { id: true, name: true } } },
					});

					return success({ data });
				});
		},
	);
