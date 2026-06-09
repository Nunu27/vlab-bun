import { success } from "@jawit/common";
import db from "@manager/db";
import caching from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { RequestWithId } from "@vlab/shared/schemas/common";

export default createRouter()
	.use(caching)
	.guard(
		{
			cached: true,
			personalized: true,
			private: ["student"],
			params: RequestWithId(["labId"]),
		},
		(app) => {
			return app
				.resolve(({ params: { labId }, entity: { key } }) => {
					return {
						cacheKey: `lab:${labId}:${key}:list`,
					};
				})
				.get("/", async ({ params: { labId }, session: { data: user } }) => {
					const history = await db.query.labSessions.findMany({
						where: (sessions, { eq, and }) => {
							return and(
								eq(sessions.labId, labId),
								eq(sessions.studentId, user.id),
							);
						},
						orderBy: (sessions, { desc }) => [desc(sessions.createdAt)],
						columns: {
							id: true,
							score: true,
							submittedAt: true,
							createdAt: true,
						},
					});

					return success({ data: history });
				});
		},
	);
