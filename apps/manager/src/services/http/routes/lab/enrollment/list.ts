import { success } from "@jawit/common";
import db from "@manager/db";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";
import { RequestWithId } from "@vlab/shared/schemas/common";

export default createRouter()
	.use(auth)
	.guard(
		{
			private: ["instructor"],
			params: RequestWithId(["labId"]),
		},
		(app) => {
			return app.get("/", async ({ params: { labId } }) => {
				const items = await db.query.labEnrollments.findMany({
					where: (enrollment, { eq }) => eq(enrollment.labId, labId),
					with: {
						student: {
							with: {
								user: {
									columns: { id: true, name: true },
								},
								sessions: {
									where: (session, { eq }) => eq(session.labId, labId),
									orderBy: (session, { desc }) => [desc(session.score)],
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
					data: formattedItems,
				});
			});
		},
	);
