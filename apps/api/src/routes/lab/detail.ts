import db from "@api/db";
import caching from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import { failure, success } from "@jawit/common";
import { RequestWithId } from "@vlab/shared/schemas/common";

export default createRouter()
	.use(caching)
	.guard(
		{
			private: ["student", "instructor"],
			params: RequestWithId(["labId"]),
			cached: true,
		},
		(app) => {
			return app
				.resolve(({ params: { labId: id }, entity: { key } }) => ({
					cacheKey: `${key}:${id}`,
				}))
				.get(
					"/:labId",
					async ({ params: { labId: id }, status, entity: { label } }) => {
						const data = await db.query.labs.findFirst({
							where: (labs, { eq }) => eq(labs.id, id),
						});

						if (data) return success({ data });
						else return status(404, failure({ message: `${label} not found` }));
					},
				);
		},
	);
