import { success } from "@jawit/common";
import { createPaginator } from "@jawit/paginator";
import db from "@manager/db";
import { createRouter } from "@manager/services/http/plugins/system";
import auth from "../../middlewares/auth";

const { paginate, schema } = createPaginator(db, "departments", {
	searchableColumns: ["name"],
	usableColumns: ["name", "createdAt", "updatedAt"],
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
