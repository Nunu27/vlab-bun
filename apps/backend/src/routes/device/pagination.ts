import db from "@backend/db";
import { createRouter } from "@backend/plugins/services";
import { md5 } from "@backend/utils/crypto";
import { createPaginator } from "@backend/utils/paginator";
import { success } from "@backend/utils/response";

const paginator = createPaginator(db, "devices", {
	searchableColumns: ["name"]
});

export default createRouter().guard(
	{
		cached: true,
		private: ["admin"],
		body: paginator.schema,
		detail: {
			description: "Get paginated devices data"
		}
	},
	(app) =>
		app
			.resolve(({ body }) => ({
				cacheKey: `device:pagination:${md5(JSON.stringify(body))}`
			}))
			.post("/pagination", async ({ body }) => {
				const data = await paginator.paginate(body, {
					columns: {
						categoryId: false,
						env: false,
						connection: false,
						interfaces: false,
						resources: false,
						createdAt: false,
						updatedAt: false
					},
					with: {
						category: {
							columns: { id: true, name: true }
						}
					}
				});

				return success({ data });
			})
);
