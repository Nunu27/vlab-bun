import { failure, success } from "@jawit/common";
import db from "@manager/db";
import caching from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { RequestWithId } from "@vlab/shared/schemas/common";

export default createRouter()
	.use(caching)
	.guard(
		{
			cached: true,
			private: ["admin"],
			params: RequestWithId(),
		},
		(app) =>
			app
				.resolve(({ params: { id }, entity: { key } }) => ({
					cacheKey: `${key}:${id}`,
				}))
				.get("/:id", async ({ params: { id }, status, entity: { label } }) => {
					const student = await db.query.students.findFirst({
						columns: { studyProgramId: false },
						with: {
							user: { columns: { name: true, email: true } },
							studyProgram: { columns: { id: true, name: true } },
						},
						where: (s, { eq }) => eq(s.id, id),
					});

					if (student) {
						const { user, ...data } = student;

						return success({ data: { ...data, ...user } });
					} else return status(404, failure({ message: `${label} not found` }));
				}),
	);
