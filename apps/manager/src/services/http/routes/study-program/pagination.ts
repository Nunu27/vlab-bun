import { success } from "@jawit/common";
import { createPaginator } from "@jawit/paginator";
import db from "@manager/db";
import caching from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { md5 } from "@manager/utils/hash";

const { paginate, schema } = createPaginator(db, "studyPrograms", {
	searchableColumns: ["name"],
	usableColumns: ["name", "departmentId", "createdAt", "updatedAt"],
});

export default createRouter()
	.use(caching)
	.guard(
		{
			private: ["admin"],
			body: schema,
			cached: true,
		},
		(app) =>
			app
				.resolve(({ body, entity: { key } }) => ({
					cacheKey: `${key}:pagination:${md5(body)}`,
				}))
				.post("/pagination", async ({ body }) => {
					const data = await paginate(body, {
						columns: {
							departmentId: false,
							createdAt: false,
							updatedAt: false,
						},
						with: {
							department: { columns: { id: true, name: true } },
						},
					});

					return success({ data });
				}),
	);
