import { createRouter } from "@backend/plugins/services";
import { failure, success } from "@backend/utils/response";
import { RequestWithId } from "@vlab/shared/schemas/common";

export default createRouter().guard(
	{
		cached: true,
		private: ["admin"],
		params: RequestWithId,
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
