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
				.resolve(({ params: { id }, entity: { key }, cache }) =>
					cache.set(`${key}:${id}`),
				)
				.get("/:id", async ({ params: { id }, status, entity: { label } }) => {
					const data = await db.query.deviceTemplates.findFirst({
						where: (dt, { eq }) => eq(dt.id, id),
					});

					if (data) return success({ data });
					else return status(404, failure({ message: `${label} not found` }));
				}),
	);
