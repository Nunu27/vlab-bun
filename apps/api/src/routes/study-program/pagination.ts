import db from "@api/db";
import caching from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import { md5 } from "@api/utils/hash";
import { success } from "@jawit/common";
import { createPaginator } from "@jawit/paginator";

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
