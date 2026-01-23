import db from "@backend/db";
import { devices, labSessions } from "@backend/db/schema";
import env from "@backend/env";
import { createRouter } from "@backend/plugins/services";
import { createGuacamoleToken } from "@backend/utils/crypto";
import { failure, success } from "@backend/utils/response";
import { toKebabCase } from "@backend/utils/string";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { eq, inArray } from "drizzle-orm";

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
			.get("/session/:id", async ({ params: { id }, status }) => {
				const session = await db.query.labSessions.findFirst({
					where: eq(labSessions.id, id),
					columns: {
						id: true,
						type: true,
						createdAt: true
					},
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
								name: true,
								health: true,
								ports: true,
								interfaces: true
							}
						}
					}
				});

				if (!session) {
					return status(404, failure({ message: "Session not found" }));
				}

				if (!session.lab) {
					return status(404, failure({ message: "Lab not found" }));
				}

				// Fetch device templates
				const deviceIds = new Set(
					session.lab.topology.nodes
						.filter((n) => n.type === "device")
						.map((n) => n.deviceId)
				);

				const deviceTemplates =
					deviceIds.size > 0
						? await db.query.devices.findMany({
								where: inArray(devices.id, Array.from(deviceIds)),
								columns: {
									id: true,
									connection: true
								}
							})
						: [];
				const deviceMap = new Map(deviceTemplates.map((d) => [d.id, d]));

				// Map tokens to nodes
				const nodesWithTokens = session.lab.topology.nodes.map((node) => {
					if (node.type !== "device") return node;

					const deviceTemplate = deviceMap.get(node.deviceId);
					if (!deviceTemplate) return node;

					const nodeName = toKebabCase(node.label);
					const labNode = session.nodes.find((n) => n.name === nodeName);

					if (!labNode) return node;

					const internalPort = deviceTemplate.connection.data.port;
					const externalPort = labNode.ports[internalPort];

					if (!externalPort) return node;

					const token = createGuacamoleToken({
						connection: {
							type: deviceTemplate.connection.type,
							settings: {
								hostname: env.CLAB_HOST,
								port: externalPort.toString(),
								username: deviceTemplate.connection.data.username,
								password: deviceTemplate.connection.data.password
							}
						}
					});

					return {
						...node,
						token
					};
				});

				return success({
					data: {
						id: session.id,
						type: session.type,
						createdAt: session.createdAt.toISOString(),
						lab: {
							id: session.lab.id,
							name: session.lab.name,
							topology: {
								...session.lab.topology,
								nodes: nodesWithTokens
							}
						}
					}
				});
			})
);

export default sessionRoutes;
