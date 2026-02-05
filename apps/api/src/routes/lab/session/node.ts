import db from "@api/db";
import env from "@api/env";
import caching from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import guacamole from "@api/services/guacamole";
import { failure, success } from "@jawit/common";
import { RequestWithId } from "@vlab/shared/schemas/common";

const CLAB_HOST = new URL(env.CLAB_URL).hostname;

export default createRouter()
	.use(caching)
	.guard(
		{
			cached: true,
			private: ["student"],
			params: RequestWithId(["labId", "labSessionId", "id"]),
		},
		(app) => {
			return app
				.resolve(({ params: { id, labId, labSessionId } }) => ({
					cacheKey: `lab:${labId}:session:${labSessionId}:node:${id}`,
				}))
				.get(
					"/:labSessionId/node/:id",
					async ({ params: { id, labId, labSessionId }, status }) => {
						const node = await db.query.labSessionNodes.findFirst({
							where: (n, { eq }) => eq(n.id, id),
							columns: { id: true, name: true, health: true, ports: true },
							with: {
								deviceTemplate: { columns: { connection: true } },
								labSession: { columns: { id: true, labId: true } },
							},
						});
						if (!node) {
							return status(404, failure({ message: "Node not found" }));
						}

						const { ports, deviceTemplate, labSession, ...nodeData } = node;

						if (labSession.id !== labSessionId || labSession.labId !== labId) {
							return status(404, failure({ message: "Node not found" }));
						}

						const {
							type,
							data: { port, username, password },
						} = deviceTemplate.connection;

						return success({
							data: {
								...nodeData,
								token: guacamole.generateToken({
									type,
									settings: {
										hostname: CLAB_HOST,
										port: ports[port].toString(),
										username,
										password,
									},
								}),
							},
						});
					},
				);
		},
	);
