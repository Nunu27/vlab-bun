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
								},
							},
						},
					},
				});

				const formattedItems = items.map((item) => {
					const { student } = item;
					const { user, sessions, ...studentData } = student;

					// Find the latest session for status
					const latestSession = [...sessions].sort(
						(a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
					)[0];
					const status = !latestSession
						? "Not Started"
						: latestSession.submittedAt
							? "Submitted"
							: "In Progress";

					// Find highest score
					let highestScore: number | null = null;
					sessions.forEach((s) => {
						if (s.score !== null) {
							const num = Number(s.score);
							if (highestScore === null || num > highestScore)
								highestScore = num;
						}
					});

					return {
						id: item.studentId,
						name: user.name,
						nrp: studentData.nrp,
						status,
						score: highestScore !== null ? String(highestScore) : null,
						lastUpdated: latestSession
							? latestSession.updatedAt || latestSession.createdAt
							: item.createdAt,
					};
				});

				return success({
					data: formattedItems,
				});
			});
		},
	);
