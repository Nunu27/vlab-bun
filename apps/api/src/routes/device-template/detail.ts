import db from "@api/db";
import caching from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import { failure, success } from "@jawit/common";
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
					const data = await db.query.deviceTemplates.findFirst({
						where: (dt, { eq }) => eq(dt.id, id),
					});

					if (data) return success({ data });
					else return status(404, failure({ message: `${label} not found` }));
				}),
	);
