import db from "@backend/db";
import { createRouter } from "@backend/plugins/services";
import { failure, success } from "@backend/utils/response";
import { RequestWithId } from "@vlab/shared/schemas/common";

const sessionRoutes = createRouter().guard(
	{
		protected: true,
		params: RequestWithId
	},
	(app) =>
		app
			.resolve(({ params }) => ({
				cacheKey: `lab:session:${params.id}`
			}))
			.get(
				"/:id",
				async ({
					params: { id },
					session: {
						data: { id: userId }
					},
					status
				}) => {
					const session = await db.query.labSessions.findFirst({
						where: (labSessions, { and, eq }) =>
							and(
								eq(labSessions.id, id),
								eq(labSessions.type, "user"),
								eq(labSessions.ownerId, userId)
							),
						columns: { id: true },
						with: {
							lab: {
								columns: {
									id: true,
									name: true,
									topology: true
								}
							},
							nodes: {
								columns: {
									id: true,
									name: true,
									health: true,
									interfaces: true
								}
							}
						}
					});

					if (!session) {
						return status(404, failure({ message: "Session not found" }));
					} else if (!session.lab) {
						return status(404, failure({ message: "Lab not found" }));
					}

					const nodes: Record<string, (typeof session.nodes)[number]> = {};

					for (const node of session.nodes) {
						nodes[node.name] = node;
					}

					return success({
						data: {
							...session,
							lab: session.lab,
							nodes
						}
					});
				}
			)
);

export default sessionRoutes;
