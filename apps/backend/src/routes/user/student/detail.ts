import { createRouter } from "@backend/plugins/services";
import { failure, success } from "@backend/utils/response";
import { RequestWithId } from "@vlab/shared/schemas";

export default createRouter().guard(
	{
		cached: true,
		private: ["admin"],
		params: RequestWithId,
		detail: {
			description: "Get student detail"
		}
	},
	(app) =>
		app
			.resolve(({ params }) => ({
				cacheKey: `student:${params.id}`
			}))
			.get("/:id", async ({ params, db, status }) => {
				const { id } = params;

				const student = await db.query.students.findFirst({
					columns: {
						studyProgramId: false
					},
					with: {
						user: {
							columns: {
								name: true,
								email: true
							}
						},
						studyProgram: {
							columns: {
								id: true,
								name: true
							}
						}
					},
					where: (student, { eq }) => eq(student.id, id)
				});
				if (!student) {
					return status(404, failure({ message: "Student not found" }));
				}

				const { user, ...data } = student;

				return success({
					data: {
						...data,
						...user
					}
				});
			})
);
