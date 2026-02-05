import db from "@api/db";
import caching from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import { failure, success } from "@jawit/common";
import { RequestWithId } from "@vlab/shared/schemas/common";

export default createRouter()
	.use(caching)
	.guard(
		{
			cached: true,
			protected: true,
			params: RequestWithId(["labSessionId", "labId"]),
		},
		(app) => {
			return app
				.resolve(
					({ params: { labSessionId: id, labId }, entity: { key } }) => ({
						cacheKey: `lab:${labId}:${key}:${id}`,
					}),
				)
				.get(
					"/:labSessionId",
					async ({
						params: { labSessionId: id, labId },
						session: {
							data: { id: userId },
						},
						status,
						entity: { label },
					}) => {
						const session = await db.query.labSessions.findFirst({
							columns: { id: true, score: true, createdAt: true },
							where: (s, { and, eq }) => {
								return and(
									eq(s.id, id),
									eq(s.studentId, userId),
									eq(s.labId, labId),
								);
							},
							with: {
								nodes: {
									columns: {
										id: true,
										labNodeId: true,
										health: true,
										interfaces: true,
									},
								},
							},
						});

						if (session) {
							const nodes: Record<
								string,
								Omit<(typeof session.nodes)[number], "labNodeId">
							> = {};

							session.nodes.forEach(({ labNodeId, ...node }) => {
								nodes[labNodeId] = node;
							});

							return success({ data: { ...session, nodes } });
						}
						return status(404, failure({ message: `${label} not found` }));
					},
				);
		},
	);
