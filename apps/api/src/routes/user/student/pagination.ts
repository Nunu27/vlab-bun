import db from "@api/db";
import caching from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import { md5 } from "@api/utils/hash";
import { success } from "@jawit/common";
import { createPaginator } from "@jawit/paginator";

const { paginate, schema } = createPaginator(db, "students", {
	searchableColumns: ["nrp"],
	usableColumns: ["nrp", "year", "degreeLevel", "createdAt", "updatedAt"],
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
						columns: { studyProgramId: false },
						with: {
							user: { columns: { name: true, email: true } },
							studyProgram: { columns: { id: true, name: true } },
						},
					});

					return success({
						data: {
							...data,
							items: data.items.map(({ user, ...item }) => ({
								...item,
								...user,
							})),
						},
					});
				}),
	);
