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
					const data = await db.query.studyPrograms.findFirst({
						columns: { departmentId: false },
						with: { department: { columns: { id: true, name: true } } },
						where: (sp, { eq }) => eq(sp.id, id),
					});

					if (data) return success({ data });
					else return status(404, responses.notFound(label));
				},
			),
	);
