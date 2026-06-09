import { failure, success } from "@jawit/common";
import db from "@manager/db";
import caching from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { RequestWithId } from "@vlab/shared/schemas/common";

export default createRouter()
	.use(caching)
	.guard(
		{
			private: ["admin"],
			params: RequestWithId(),
			cached: true,
		},
		(app) =>
			app
				.resolve(({ params: { id }, entity: { key } }) => ({
					cacheKey: `${key}:${id}`,
				}))
				.get("/:id", async ({ params: { id }, status, entity: { label } }) => {
					const data = await db.query.studyPrograms.findFirst({
						columns: { departmentId: false },
						with: { department: { columns: { id: true, name: true } } },
						where: (sp, { eq }) => eq(sp.id, id),
					});

					if (data) return success({ data });
					else return status(404, failure({ message: `${label} not found` }));
				}),
	);
