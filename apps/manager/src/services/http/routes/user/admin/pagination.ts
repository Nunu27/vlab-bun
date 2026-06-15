import { success } from "@jawit/common";
import { createPaginator } from "@jawit/paginator";
import db from "@manager/db";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";

const { paginate, schema } = createPaginator(db, "users", {
	usableColumns: ["id", "name", "email", "createdAt", "updatedAt"],
	searchableColumns: ["name", "email"],
});

export default createRouter()
	.use(auth)
	.guard(
		{
			private: ["admin"],
			body: schema,
		},
		(app) =>
			app.post("/pagination", async ({ body }) => {
				const data = await paginate(body, {
					where: (users, { eq }) => eq(users.role, "admin"),
					columns: { passwordHash: false, role: false },
				});

				return success({ data });
			}),
	);
