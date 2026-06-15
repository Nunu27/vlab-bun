import { success } from "@jawit/common";
import { createPaginator } from "@jawit/paginator";
import db from "@manager/db";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";

const { paginate, schema } = createPaginator(db, "instructors", {
	searchableColumns: ["nip"],
	usableColumns: ["nip", "createdAt", "updatedAt"],
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
					with: { user: { columns: { name: true, email: true } } },
				});

				return success({
					data: {
						...data,
						items: data.items.map(({ user, ...item }) => ({
							...item,
							...user,
						})),
					},
				});
			}),
	);
