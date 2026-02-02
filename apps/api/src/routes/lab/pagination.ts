import db from "@api/db";
import caching from "@api/middlewares/caching";
import { success } from "@jawit/common";
import { createPaginator } from "@jawit/drizzle-paginator";
import Elysia from "elysia";

const { paginate, schema } = createPaginator(db, "labs", {
	searchableColumns: ["name"],
	usableColumns: ["name", "createdAt", "updatedAt"],
});

export default new Elysia().use(caching).get(
	"/pagination",
	async ({ query, session }) => {
		const data = await paginate(query, {
			columns: { topology: false },
			with: {
				instructor: {
					columns: { id: true },
					with: {
						user: {
							columns: { name: true },
						},
					},
				},
			},
			where: (labs, { eq }) => {
				if (session.data.role === "student") {
					return eq(labs.isPublished, true);
				} else {
					return eq(labs.instructorId, session.data.id);
				}
			},
		});

		return success({
			data: {
				...data,
				items: data.items.map(
					({ instructor: { user, ...instructor }, ...item }) => ({
						...item,
						instructor: {
							...user,
							...instructor,
						},
					}),
				),
			},
		});
	},
	{
		private: ["instructor", "student"],
		query: schema,
	},
);
