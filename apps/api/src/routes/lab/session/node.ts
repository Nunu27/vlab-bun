import db from "@api/db";
import caching from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import guacamole from "@api/services/guacamole";
import { failure, success } from "@jawit/common";
import { RequestWithId } from "@vlab/shared/schemas/common";

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
				.resolve(
					({ params: { id, labId, labSessionId }, entity: { key } }) => ({
						cacheKey: `lab:${labId}:${key}:${labSessionId}:node:${id}`,
					}),
				)
				.get(
					"/:labSessionId/node/:id",
					async ({ params: { id, labId, labSessionId }, status }) => {
						const node = await db.query.labSessionNodes.findFirst({
							where: (n, { eq }) => eq(n.id, id),
							columns: { id: true, name: true, health: true, ip: true },
							with: {
								deviceTemplate: { columns: { connection: true } },
								labSession: { columns: { id: true, labId: true } },
							},
						});
						if (!node) {
							return status(404, failure({ message: "Node not found" }));
						}

						const { ip, deviceTemplate, labSession, ...nodeData } = node;

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
										hostname: ip,
										port: port.toString(),
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
