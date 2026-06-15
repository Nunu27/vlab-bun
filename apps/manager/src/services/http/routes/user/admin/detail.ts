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
				const admin = await db.query.users.findFirst({
					columns: { passwordHash: false },
					where: (u, { eq, and }) => and(eq(u.id, id), eq(u.role, "admin")),
				});

				if (admin) return success({ data: admin });
				else return status(404, failure({ message: `${label} not found` }));
			}),
	);
