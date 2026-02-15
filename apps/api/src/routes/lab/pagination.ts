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
			body: t.Intersect([
				schema,
				t.Object({ enrolled: t.Optional(t.Boolean()) }),
			]),
		},
		(app) => {
			return app
				.resolve(({ session: { data }, body, cache, entity: { key } }) => {
					cache.addSuffix(md5(body));

					if (data.role === "admin" || body.enrolled) {
						cache.addSuffix(data.id);
					}

					return {
						cacheKey: `${key}:pagination`,
					};
				})
				.post(
					"/pagination",
					async ({ body: { enrolled, ...body }, session }) => {
						const { items, pageInfo } = await paginate(body, {
							columns: {
								content: false,
								topology: false,
								instructions: false,
								instructorId: false,
							},
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
									({
										instructor: { user, ...instructor },
										startAt,
										endAt,
										...item
									}) => ({
										...item,
										date: { from: startAt, to: endAt },
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
