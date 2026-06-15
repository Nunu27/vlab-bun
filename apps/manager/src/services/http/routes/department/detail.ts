import { failure, success } from "@jawit/common";
import db from "@manager/db";
import { createRouter } from "@manager/services/http/plugins/system";
import { RequestWithId } from "@vlab/shared/schemas/common";
import auth from "../../middlewares/auth";

export default createRouter()
	.use(auth)
	.guard(
		{
			private: ["admin"],
			params: RequestWithId(),
		},
		(app) => {
			return app.get(
				"/:id",
				async ({ params: { id }, status, entity: { label } }) => {
					const data = await db.query.departments.findFirst({
						where: (d, { eq }) => eq(d.id, id),
					});

					if (data) return success({ data });
					else return status(404, failure({ message: `${label} not found` }));
				},
			);
		},
	);
