import { success } from "@jawit/common";
import { createPaginator } from "@jawit/paginator";
import db from "@manager/db";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";

const { paginate, schema } = createPaginator(db, "students", {
	searchableColumns: ["nrp"],
	usableColumns: ["nrp", "year", "degreeLevel", "createdAt", "updatedAt"],
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
					columns: { studyProgramId: false },
					with: {
						user: { columns: { name: true, email: true } },
						studyProgram: { columns: { id: true, name: true } },
					},
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
