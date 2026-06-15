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
				.resolve(({ params: { id }, entity: { key }, cache }) =>
					cache.set(`${key}:${id}`),
				)
				.get("/:id", async ({ params: { id }, status, entity: { label } }) => {
					const instructor = await db.query.instructors.findFirst({
						with: { user: { columns: { name: true, email: true } } },
						where: (i, { eq }) => eq(i.id, id),
					});

					if (instructor) {
						const { user, ...data } = instructor;

						return success({ data: { ...data, ...user } });
					} else return status(404, failure({ message: `${label} not found` }));
				}),
	);
