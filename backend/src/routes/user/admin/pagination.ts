import db from "@/db";
import { AppWithServices } from "@/plugins/services";
import { md5 } from "@/utils/crypto";
import { createPaginator } from "@/utils/paginator";
import { success } from "@/utils/response";

const paginator = createPaginator(db, "users", {
	usableColumns: ["id", "name", "email", "role", "createdAt", "updatedAt"]
});

export default (app: AppWithServices) =>
	app.guard(
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
				.post(
					"/pagination",
					async ({ body }) => {
						body.filters ??= [];
						body.filters.push({
							field: "role",
							op: "eq",
							value: "admin"
						});

						const data = await paginator.paginate(body, {
							columns: {
								passwordHash: false
							}
						});

						return success({ data });
					},
					{ body: paginator.schema }
				)
	);
