import db from "@backend/db";
import { createRouter } from "@backend/plugins/services";
import { md5 } from "@backend/utils/crypto";
import { createPaginator } from "@backend/utils/paginator";
import { success } from "@backend/utils/response";

const paginator = createPaginator(db, "users", {
	usableColumns: ["id", "name", "email", "createdAt", "updatedAt"],
	searchableColumns: ["name", "email"]
});

export default createRouter().guard(
	{
		cached: true,
		private: ["admin"],
		body: paginator.schema,
		detail: {
			description: "Get paginated admins data"
		}
	},
	(app) =>
		app
			.resolve(({ body }) => ({
				cacheKey: `admin:pagination:${md5(JSON.stringify(body))}`
			}))
			.post("/pagination", async ({ body }) => {
				const data = await paginator.paginate(body, {
					where: (users, { eq }) => eq(users.role, "admin"),
					columns: {
						passwordHash: false,
						role: false
					}
				});

				return success({ data });
			})
);
