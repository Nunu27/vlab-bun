import db from "@api/db";
import caching from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import { md5 } from "@api/utils/hash";
import { success } from "@jawit/common";
import { createPaginator } from "@jawit/paginator";
import { t } from "elysia";

const { paginate, schema } = createPaginator(db, "labs", {
	searchableColumns: ["name"],
	usableColumns: ["name", "createdAt", "updatedAt"],
});

// TODO: enrolled query
export default createRouter()
	.use(caching)
	.guard(
		{
			cached: true,
			private: ["instructor", "student"],
			query: t.Intersect([
				schema,
				t.Object({ enrolled: t.Optional(t.Boolean()) }),
			]),
		},
		(app) => {
			return app
				.resolve(({ session: { data }, query, entity: { key } }) => {
					const cacheKey = `${key}:pagination:${md5(query)}`;

					if (data.role === "admin" || query.enrolled) {
						return { cacheKey: `${cacheKey}:${data.id}` };
					} else return { cacheKey };
				})
				.get(
					"/pagination",
					async ({ query: { enrolled, ...query }, session }) => {
						const { items, pageInfo } = await paginate(query, {
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
								pageInfo,
								items: items.map(
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
				);
		},
	);
