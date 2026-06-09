import { success } from "@jawit/common";
import { createPaginator } from "@jawit/paginator";
import db from "@manager/db";
import { labEnrollments } from "@manager/db/schema/lab";
import caching from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { md5 } from "@manager/utils/hash";
import { and, eq, inArray } from "drizzle-orm";
import { t } from "elysia";

const { paginate, schema } = createPaginator(db, "labs", {
	searchableColumns: ["name"],
	usableColumns: ["name", "createdAt", "updatedAt"],
});

export default createRouter()
	.use(caching)
	.guard(
		{
			cached: true,
			private: ["instructor", "student"],
			body: t.Composite([
				schema,
				t.Object({ enrolled: t.Optional(t.Boolean()) }),
			]),
		},
		(app) => {
			return app
				.resolve(({ session: { data }, body, cache, entity: { key } }) => {
					cache.addSuffix(md5(body));

					if (data.role === "instructor" || body.enrolled !== undefined) {
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
								id: true,
								name: true,
								cover: true,
								startAt: true,
								endAt: true,
								createdAt: true,
								isPublished: true,
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
							where: (labs) => {
								if (session.data.role === "student") {
									const isPublished = eq(labs.isPublished, true);

									if (enrolled) {
										return and(
											isPublished,
											inArray(
												labs.id,
												db
													.select({ id: labEnrollments.labId })
													.from(labEnrollments)
													.where(eq(labEnrollments.studentId, session.data.id)),
											),
										);
									}

									return isPublished;
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
