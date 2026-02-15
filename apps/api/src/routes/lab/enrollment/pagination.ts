import db from "@api/db";
import caching from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import { md5 } from "@api/utils/hash";
import { success } from "@jawit/common";
import { createPaginator } from "@jawit/paginator";
import { RequestWithId } from "@vlab/shared/schemas/common";

const { paginate, schema } = createPaginator(db, "labEnrollments", {
	searchableColumns: ["studentId"],
	usableColumns: ["createdAt"],
});

export default createRouter()
	.use(caching)
	.guard(
		{
			cached: true,
			private: ["instructor"],
			params: RequestWithId(["labId"]),
			body: schema,
		},
		(app) => {
			return app
				.resolve(({ body, cache, entity: { key } }) => {
					cache.addSuffix(md5(body));
					return {
						cacheKey: `${key}:enrollment:pagination`,
					};
				})
				.post(
					"/:labId/enrollment/pagination",
					async ({ params: { labId }, body }) => {
						const { items, pageInfo } = await paginate(body, {
							where: (enrollment, { eq }) => eq(enrollment.labId, labId),
							with: {
								student: {
									with: {
										user: {
											columns: { id: true, name: true },
										},
										sessions: {
											where: (session, { eq }) => eq(session.labId, labId),
											limit: 1,
										},
									},
								},
							},
						});

						const formattedItems = items.map((item) => {
							const { student, ...rest } = item;
							const { user, sessions, ...studentData } = student;
							const session = sessions.length > 0 ? sessions[0] : null;

							return {
								...rest,
								student: {
									...user,
									...studentData,
								},
								session,
							};
						});

						return success({
							data: {
								items: formattedItems,
								pageInfo,
							},
						});
					},
				);
		},
	);
