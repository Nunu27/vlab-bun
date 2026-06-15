import { success } from "@jawit/common";
import { createPaginator } from "@jawit/paginator";
import db from "@manager/db";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";

const { paginate, schema } = createPaginator(db, "studyPrograms", {
	searchableColumns: ["name"],
	usableColumns: ["name", "departmentId", "createdAt", "updatedAt"],
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
					columns: {
						departmentId: false,
						createdAt: false,
						updatedAt: false,
					},
					with: {
						department: { columns: { id: true, name: true } },
					},
				});

				return success({ data });
			}),
	);
