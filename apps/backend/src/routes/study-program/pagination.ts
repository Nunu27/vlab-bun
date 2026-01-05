import db from "@backend/db";
import { createRouter } from "@backend/plugins/services";
import { md5 } from "@backend/utils/crypto";
import { createPaginator } from "@backend/utils/paginator";
import { success } from "@backend/utils/response";

const paginator = createPaginator(db, "studyPrograms", {
	searchableColumns: ["name"]
});

export default createRouter().guard(
	{
		cached: true,
		private: ["admin"],
		query: paginator.schema,
		detail: {
			description: "Get paginated study programs data"
		}
	},
	(app) =>
		app
			.resolve(({ query }) => ({
				cacheKey: `study-program:pagination:${md5(JSON.stringify(query))}`
			}))
			.get("/pagination", async ({ query }) => {
				const data = await paginator.paginate(query, {
					columns: {
						departmentId: false,
						createdAt: false,
						updatedAt: false
					},
					with: {
						department: {
							columns: {
								id: true,
								name: true
							}
						}
					}
				});

				return success({ data });
			})
);
