import { responses, success } from "@jawit/common";
import db from "@manager/db";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";
import { RequestWithId } from "@vlab/shared/schemas/common";

export default createRouter()
	.use(auth)
	.guard(
		{
			private: ["admin"],
			params: RequestWithId(),
		},
		(app) =>
			app.get(
				"/:id",
				async ({ params: { id }, status, ENTITY: { LABEL: label } }) => {
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
					} else return status(404, responses.notFound(label));
				},
			),
	);
