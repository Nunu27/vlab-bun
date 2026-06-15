import { failure, success } from "@jawit/common";
import db from "@manager/db";
import caching from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
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
					({ params: { labSessionId: id, labId }, entity: { key }, cache }) =>
						cache.set(`lab:${labId}:${key}:${id}`),
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
							columns: {
								id: true,
								dueDate: true,
							},
							where: (s, { and, eq, isNull }) => {
								return and(
									eq(s.id, id),
									isNull(s.submittedAt),
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
								checks: {
									columns: {
										checkId: true,
										completed: true,
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

							const checks: Record<string, boolean> = {};
							session.checks?.forEach((check) => {
								checks[check.checkId] = check.completed;
							});

							return success({
								data: {
									...session,
									nodes,
									checks,
								},
							});
						}
						return status(404, failure({ message: `${label} not found` }));
					},
				);
		},
	);
