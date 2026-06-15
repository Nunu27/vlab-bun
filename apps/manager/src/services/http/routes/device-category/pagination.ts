import { success } from "@jawit/common";
import { createPaginator } from "@jawit/paginator";
import db from "@manager/db";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";

const { paginate, schema } = createPaginator(db, "deviceCategories", {
	searchableColumns: ["name"],
	usableColumns: ["name", "color", "createdAt", "updatedAt"],
});

export default createRouter()
	.use(auth)
	.post(
		"/pagination",
		async ({ body }) => {
			const data = await paginate(body, {
				columns: {
					createdAt: false,
					updatedAt: false,
				},
			});

			return success({ data });
		},
		{
			private: ["admin"],
			body: schema,
		},
	);
