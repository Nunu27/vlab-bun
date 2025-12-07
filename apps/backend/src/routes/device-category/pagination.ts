import db from "@backend/db";
import { createRouter } from "@backend/plugins/services";
import { md5 } from "@backend/utils/crypto";
import { createPaginator } from "@backend/utils/paginator";
import { success } from "@backend/utils/response";

const paginator = createPaginator(db, "deviceCategories", {
	searchableColumns: ["name"]
});

export default createRouter().guard(
	{
		cached: true,
		private: ["admin"],
		body: paginator.schema,
		detail: {
			description: "Get paginated device categories data"
		}
	},
	(app) =>
		app
			.resolve(({ body }) => ({
				cacheKey: `device-category:pagination:${md5(JSON.stringify(body))}`
			}))
			.post("/pagination", async ({ body }) => {
				const data = await paginator.paginate(body, {
					columns: {
						createdAt: false,
						updatedAt: false
					}
				});

				return success({ data });
			})
);
