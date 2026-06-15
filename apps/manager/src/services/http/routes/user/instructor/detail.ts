import { failure, success } from "@jawit/common";
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
			app.get("/:id", async ({ params: { id }, status, entity: { label } }) => {
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
