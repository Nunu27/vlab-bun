import { success } from "@jawit/common";
import { createPaginator } from "@jawit/paginator";
import db from "@manager/db";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";

const { paginate, schema } = createPaginator(db, "deviceTemplates", {
	searchableColumns: ["name"],
	usableColumns: ["name", "kind", "deviceCategoryId", "createdAt", "updatedAt"],
});

export default createRouter()
	.use(auth)
	.post(
		"/pagination",
		async ({ body }) => {
			const data = await paginate(body, {
				columns: {
					deviceCategoryId: false,
					env: false,
					connection: false,
					interfaces: false,
					resources: false,
					createdAt: false,
					updatedAt: false,
				},
				with: { category: { columns: { id: true, name: true } } },
			});

			return success({ data });
		},
		{
			private: ["admin"],
			body: schema,
		},
	);
