import { success } from "@jawit/common";
import db from "@manager/db";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";
import { RequestWithId } from "@vlab/shared/schemas/common";

export default createRouter()
	.use(auth)
	.guard(
		{
			private: ["student"],
			params: RequestWithId(["labId"]),
		},
		(app) => {
			return app.get(
				"/",
				async ({ params: { labId }, session: { data: user } }) => {
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
				},
			);
		},
	);
