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
		query: paginator.schema,
		detail: {
			description: "Get paginated admins data"
		}
	},
	(app) =>
		app
			.resolve(({ query }) => ({
				cacheKey: `admin:pagination:${md5(JSON.stringify(query))}`
			}))
			.get("/pagination", async ({ query }) => {
				const data = await paginator.paginate(query, {
					where: (users, { eq }) => eq(users.role, "admin"),
					columns: {
						passwordHash: false,
						role: false
					}
				});

				return success({ data });
			})
);
