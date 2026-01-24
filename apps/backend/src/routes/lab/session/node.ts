import db from "@backend/db";
import env from "@backend/env";
import { createRouter } from "@backend/plugins/services";
import { createGuacamoleToken } from "@backend/utils/crypto";
import { failure, success } from "@backend/utils/response";
import { SessionNodeRequest } from "@shared/schemas/rest";

const sessionRoutes = createRouter().guard(
	{
		protected: true,
		params: SessionNodeRequest
	},
	(app) =>
		app
			.resolve(({ params }) => ({
				cacheKey: `lab:session:${params.id}:node:${params.nodeId}`
			}))
			.get(
				"/:id/node/:nodeId",
				async ({ params: { id: sessionId, nodeId }, session, status }) => {
					const data = await db.query.labNodes.findFirst({
						where: (labNodes, { eq }) => eq(labNodes.id, nodeId),
						columns: {
							id: true,
							name: true,
							health: true,
							ports: true
						},
						with: {
							device: {
								columns: {
									connection: true
								}
							},
							labSession: {
								columns: {
									id: true,
									ownerId: true
								}
							}
						}
					});

					if (!data) {
						return status(404, failure({ message: "Node not found" }));
					}

					const { ports, device, labSession, ...node } = data;

					if (!device) {
						return status(404, failure({ message: "Device not found" }));
					} else if (!labSession) {
						return status(404, failure({ message: "Lab session not found" }));
					} else if (labSession.id !== sessionId) {
						return status(403, failure({ message: "Forbidden" }));
					} else if (labSession.ownerId !== session.data.id) {
						return status(403, failure({ message: "Forbidden" }));
					}

					const internalPort = device.connection.data.port;
					const externalPort = ports[internalPort];

					return success({
						data: {
							...node,
							token: createGuacamoleToken({
								connection: {
									type: device.connection.type,
									settings: {
										hostname: env.CLAB_HOST,
										port: externalPort.toString(),
										username: device.connection.data.username,
										password: device.connection.data.password
									}
								}
							})
						}
					});
				}
			)
);

export default sessionRoutes;
