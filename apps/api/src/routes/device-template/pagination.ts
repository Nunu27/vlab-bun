import db from "@api/db";
import caching from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import { md5 } from "@api/utils/hash";
import { success } from "@jawit/common";
import { createPaginator } from "@jawit/paginator";

const { paginate, schema } = createPaginator(db, "deviceTemplates", {
	searchableColumns: ["name"],
	usableColumns: ["name", "kind", "createdAt", "updatedAt"],
});

export default createRouter()
	.use(caching)
	.guard(
		{
			private: ["admin"],
			query: schema,
			cached: true,
		},
		(app) => {
			return app
				.resolve(({ query, entity: { key } }) => ({
					cacheKey: `${key}:pagination:${md5(query)}`,
				}))
				.get("/pagination", async ({ query }) => {
					const data = await paginate(query, {
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
