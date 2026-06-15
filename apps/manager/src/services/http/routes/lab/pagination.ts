import { success } from "@jawit/common";
import { createPaginator } from "@jawit/paginator";
import db from "@manager/db";
import { labEnrollments } from "@manager/db/schema/lab";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";

import { and, eq, inArray } from "drizzle-orm";
import { t } from "elysia";

const { paginate, schema } = createPaginator(db, "labs", {
	searchableColumns: ["name"],
	usableColumns: ["name", "createdAt", "updatedAt"],
});

export default createRouter()
	.use(auth)
	.guard(
		{
			private: ["instructor", "student"],
			body: t.Composite([
				schema,
				t.Object({ enrolled: t.Optional(t.Boolean()) }),
			]),
		},
		(app) => {
			return app.post(
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
