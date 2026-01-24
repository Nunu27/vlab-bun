import db from "@backend/db";
import dbListener from "@backend/db/listener";
import { devices, labSessions, labs } from "@backend/db/schema";
import clab, { clabWrapper } from "@backend/services/clab";
import type { Link, Node } from "@backend/types/containerlab";
import { toKebabCase } from "@backend/utils/string";
import { getMonitorPorts } from "@vlab/monitor";
import { LABELS } from "@vlab/monitor/constants";
import { labWSSchemas, type WSHandler } from "@vlab/shared/schemas/ws";
import { and, eq, inArray } from "drizzle-orm";

const sessionDeleteEmitter = dbListener.createEventEmitter(
	"labSessions",
	["id"],
	(session) => session.id,
	() => null,
	{ ops: ["DELETE"] }
);

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

		if (!lab) throw new Error("Lab not found");

		reply("message", "Starting lab session...");

		const sessionId = Bun.randomUUIDv7();
		const labName = sessionId.replace(/-/g, "");

		const deviceNodes = lab.topology.nodes.filter(
			(node) => node.type === "device"
		);
		const deviceIds = new Set(deviceNodes.map((node) => node.deviceId));

		if (!deviceIds.size) throw new Error("No devices in lab topology");

		const deviceTemplates = await db.query.devices.findMany({
			where: inArray(devices.id, Array.from(deviceIds))
		});
		const deviceTemplateMap = new Map(deviceTemplates.map((d) => [d.id, d]));
		const nodes: Record<string, Node> = {};
		const nodeMap = new Map<string, string>();
		const links: Link[] = [];

		// Re-iterate to build the map first
		for (const node of deviceNodes) {
			const template = deviceTemplateMap.get(node.deviceId);
			if (!template) continue;

			const nodeName = toKebabCase(node.name);

			nodeMap.set(node.id, nodeName);

			const ports = [
				template.connection.data.port,
				...getMonitorPorts(template.kind)
			];

			nodes[nodeName] = {
				kind: template.kind,
				image: template.image,
				env: template.env,
				cpu: node.resources?.cpu || template.resources.cpu,
				memory: node.resources?.memory || template.resources.memory,
				ports: ports.map((port) => `0:${port}`),
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
									[LABELS.OWNER_ID]: session.id
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
			throw new Error(`Error during lab provisioning`);
		}

		reply("message", "Lab deployed successfully.");
		reply("sessionId", sessionId);
	},
	"lab/stop": async ({ data: { sessionId }, reply }) => {
		const session = await db.query.labSessions.findFirst({
			where: eq(labSessions.id, sessionId)
		});

		if (!session) throw new Error("Session not found");

		reply("message", "Stopping lab session...");

		const sessionPromise = sessionDeleteEmitter.wait(
			sessionId,
			() => null,
			120000,
			null
		);
		await clabWrapper(() =>
			clab.DELETE(`/api/v1/labs/{labName}`, {
				params: {
					path: { labName: sessionId.replace(/-/g, "") },
					query: { cleanup: true }
				}
			})
		);
		await sessionPromise;

		reply("message", "Lab stopped successfully.");
	}
};

export default labWSHandler;
