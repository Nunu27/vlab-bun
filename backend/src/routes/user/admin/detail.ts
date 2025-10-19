import { AppWithServices } from "@/plugins/services";
import { failure, success } from "@/utils/response";
import { t } from "elysia";

export default (app: AppWithServices) =>
	app.guard(
		{
			cached: true,
			private: ["admin"],
			params: t.Object({
				id: t.String({ format: "uuid" })
			}),
			detail: {
				description: "Get admin detail"
			}
		},
		(app) =>
			app
				.resolve(({ params }) => ({
					cacheKey: `admin:${params.id}`
				}))
				.get("/:id", async ({ params, db, status }) => {
					const { id } = params;

					const admin = await db.query.users.findFirst({
						columns: {
							passwordHash: false
						},
						where: (users, { eq, and }) =>
							and(eq(users.id, id), eq(users.role, "admin"))
					});
					if (!admin) {
						return status(404, failure({ message: "Admin not found" }));
					}

					return success({
						data: admin
					});
				})
	);
