import db from "@backend/db";
import { labSessions, labs, devices } from "@backend/db/schema";
import { labWSSchemas, type WSHandler } from "@vlab/shared/schemas";

import { eq, and, inArray } from "drizzle-orm";
import clab, { clabWrapper } from "@backend/services/clab";
import { leasePort } from "@backend/services/port-manager";
import { LABELS } from "@backend/constants";
import { encode } from "@msgpack/msgpack";
import type { Link, Node } from "@backend/types/containerlab";
import { toKebabCase } from "@backend/utils/string";
import { deleteCache } from "@backend/middlewares/caching";

const labWSHandler: WSHandler<typeof labWSSchemas> = {
	"lab/start": async ({
		data: { labId },
		socket: {
			data: { session }
		},
		reply
	}) => {
		const existingSession = await db.query.labSessions.findFirst({
			columns: { id: true },
			where: and(
				eq(labSessions.labId, labId),
				eq(labSessions.ownerId, session.id)
			)
		});

		if (existingSession) {
			return reply("sessionId", existingSession.id);
		}

		const lab = await db.query.labs.findFirst({
			columns: {
				name: true,
				topology: true
			},
			where: eq(labs.id, labId)
		});

		if (!lab) {
			reply("error", "Lab not found");
			return;
		}

		reply("message", "Starting lab session...");

		const sessionId = Bun.randomUUIDv7();
		const labName = sessionId.replace(/-/g, "");
		const ports: number[] = [];

		const deviceNodes = lab.topology.nodes.filter(
			(node) => node.type === "device"
		);
		const deviceIds = new Set(deviceNodes.map((node) => node.deviceId));

		if (deviceIds.size === 0) {
			reply("error", "Lab has no devices");
			return;
		}

		const deviceTemplates = await db.query.devices.findMany({
			where: inArray(devices.id, [...deviceIds])
		});
		const deviceTemplateMap = new Map(deviceTemplates.map((d) => [d.id, d]));
		const nodes: Record<string, Node> = {};
		const nodeMap = new Map<string, string>();
		const links: Link[] = [];

		// Re-iterate to build the map first
		for (const node of deviceNodes) {
			const template = deviceTemplateMap.get(node.deviceId);
			if (!template) continue;

			const nodeName = toKebabCase(node.label);
			const port = await leasePort();
			ports.push(port);

			nodeMap.set(node.id, nodeName);

			nodes[nodeName] = {
				kind: template.kind,
				image: template.image,
				env: template.env,
				cpu: node.resources?.cpu || template.resources.cpu,
				memory: node.resources?.memory || template.resources.memory,
				ports: [`${port}:${template.connection.data.port}`],
				labels: {
					[LABELS.NODE_ID]: Bun.randomUUIDv7(),
					[LABELS.DEVICE_ID]: node.deviceId
				}
			};
		}

		// Map Edges (Links)
		for (const edge of lab.topology.edges) {
			const src = nodeMap.get(edge.source);
			const dst = nodeMap.get(edge.target);

			if (!src || !dst) continue;

			links.push({
				endpoints: [
					`${src}:${edge.sourceHandle}`,
					`${dst}:${edge.targetHandle}`
				]
			});
		}

		try {
			reply("message", "Deploying lab...");

			const response = await clabWrapper(() =>
				clab.POST("/api/v1/labs", {
					body: {
						topologyContent: {
							name: labName,
							topology: {
								defaults: {
									labels: {
										[LABELS.SESSION_ID]: sessionId,
										[LABELS.LAB_TYPE]: "user",
										[LABELS.LAB_ID]: labId,
										[LABELS.OWNER_ID]: session.id,
										[LABELS.LAB_PORTS]: encode(ports).toBase64()
									}
								},
								nodes: nodes,
								links: links
							}
						}
					}
				})
			);

			if (!response.response.ok) {
				throw new Error(
					`Error during lab provisioning: ${response.response.statusText}`
				);
			}

			reply("message", "Lab deployed successfully.");
			reply("sessionId", sessionId);
		} catch (error) {
			await clabWrapper(() =>
				clab.DELETE(`/api/v1/labs/{labName}`, {
					params: {
						path: { labName },
						query: { cleanup: true }
					}
				})
			);

			reply("error", "Failed to start lab");
		}
	},
	"lab/stop": async ({ data: { sessionId }, reply }) => {
		const session = await db.query.labSessions.findFirst({
			where: eq(labSessions.id, sessionId)
		});

		if (!session) {
			reply("error", "Session not found");
			return;
		}

		reply("message", "Stopping lab session...");

		await clabWrapper(() =>
			clab.DELETE(`/api/v1/labs/{labName}`, {
				params: {
					path: { labName: sessionId.replace(/-/g, "") },
					query: { cleanup: true }
				}
			})
		);

		await db.delete(labSessions).where(eq(labSessions.id, sessionId));
		await deleteCache("lab:pagination:*");

		reply("message", "Lab stopped successfully.");
	}
};

export default labWSHandler;
