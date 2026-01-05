import db from "@backend/db";
import { createRouter } from "@backend/plugins/services";
import { md5 } from "@backend/utils/crypto";
import { createPaginator } from "@backend/utils/paginator";
import { success } from "@backend/utils/response";

const paginator = createPaginator(db, "lecturers", {
	searchableColumns: ["nip"]
});

export default createRouter().guard(
	{
		cached: true,
		private: ["admin"],
		query: paginator.schema,
		detail: {
			description: "Get paginated lecturers data"
		}
	},
	(app) =>
		app
			.resolve(({ query }) => ({
				cacheKey: `lecturer:pagination:${md5(JSON.stringify(query))}`
			}))
			.get("/pagination", async ({ query }) => {
				const data = await paginator.paginate(query, {
					with: {
						user: {
							columns: {
								name: true,
								email: true
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
