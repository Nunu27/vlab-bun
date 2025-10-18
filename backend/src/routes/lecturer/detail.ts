import { AppWithServices } from "@/services";
import { failure, success } from "@/utils/response";
import { t } from "elysia";

export default (app: AppWithServices) =>
	app.guard(
		{
			private: ["admin"],
			params: t.Object({
				id: t.String({ format: "uuid" })
			}),
			detail: {
				description: "Get lecturer detail"
			}
		},
		(app) =>
			app
				.resolve(({ params }) => ({
					cacheKey: `lecturer:${params.id}`
				}))
				.get("/:id", async ({ params, db, status }) => {
					const { id } = params;

					const lecturer = await db.query.lecturers.findFirst({
						with: {
							user: {
								columns: {
									name: true,
									email: true
								}
							}
						},
						where: (lecturer, { eq }) => eq(lecturer.id, id)
					});
					if (!lecturer) {
						return status(404, failure({ message: "Lecturer not found" }));
					}

					const { user, ...data } = lecturer;

					return success({
						data: {
							...data,
							...user
						}
					});
				})
	);
