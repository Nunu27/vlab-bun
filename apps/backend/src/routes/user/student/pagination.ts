import db from "@backend/db";
import { createRouter } from "@backend/plugins/services";
import { md5 } from "@backend/utils/crypto";
import { createPaginator } from "@backend/utils/paginator";
import { success } from "@backend/utils/response";

const paginator = createPaginator(db, "students", {
	searchableColumns: ["nrp"]
});

export default createRouter().guard(
	{
		cached: true,
		private: ["admin"],
		query: paginator.schema,
		detail: {
			description: "Get paginated students data"
		}
	},
	(app) =>
		app
			.resolve(({ query }) => ({
				cacheKey: `student:pagination:${md5(JSON.stringify(query))}`
			}))
			.get("/pagination", async ({ query }) => {
				const data = await paginator.paginate(query, {
					columns: {
						studyProgramId: false
					},
					with: {
						user: {
							columns: {
								name: true,
								email: true
							}
						},
						studyProgram: {
							columns: {
								id: true,
								name: true
							}
						}
					}
				});

				return success({
					data: {
						...data,
						items: data.items.map(({ user, ...item }) => ({
							...item,
							...user
						}))
					}
				});
			})
);
