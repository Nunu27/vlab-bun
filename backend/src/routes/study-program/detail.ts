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
				description: "Get study program detail"
			}
		},
		(app) =>
			app
				.resolve(({ params }) => ({
					cacheKey: `study-program:${params.id}`
				}))
				.get("/:id", async ({ params, db, status }) => {
					const { id } = params;

					const data = await db.query.studyPrograms.findFirst({
						columns: {
							departmentId: false
						},
						with: {
							department: {
								columns: {
									id: true,
									name: true
								}
							}
						},
						where: (studyProgram, { eq }) => eq(studyProgram.id, id)
					});

					if (!data) {
						return status(404, failure({ message: "Study program not found" }));
					}

					return success({
						data
					});
				})
	);
