import db from "@backend/db";
import dbListener from "@backend/db/listener";
import { devices, labSessions, labs } from "@backend/db/schema";
import clab from "@backend/services/clab";
import type { LabLink } from "@backend/types/containerlab";
import { getMonitorPorts } from "@vlab/monitor";
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

		const deviceIds = new Set<string>();
		const deviceNodes = lab.topology.nodes.filter((node) => {
			const isDevice = node.type === "device";
			if (isDevice) deviceIds.add(node.deviceId);

			return isDevice;
		});

		if (!deviceIds.size) throw new Error("No devices in lab topology");

		const deviceTemplates = await db.query.devices.findMany({
			where: inArray(devices.id, Array.from(deviceIds))
		});
		const deviceTemplateMap = new Map(deviceTemplates.map((d) => [d.id, d]));

		// Build nodes configuration
		const nodeMap = new Map<string, string>();
		const nodes = deviceNodes.map((node) => {
			const template = deviceTemplateMap.get(node.deviceId);
			if (!template) {
				throw new Error(`Device template not found for ${node.deviceId}`);
			}

			const id = Bun.randomUUIDv7();
			nodeMap.set(node.id, id);

			return {
				id,
				name: node.name,
				kind: template.kind,
				image: template.image,
				env: template.env,
				ports: [
					template.connection.data.port,
					...getMonitorPorts(template.kind)
				],
				resources: {
					cpu: node.resources?.cpu || template.resources.cpu,
					memory: node.resources?.memory || template.resources.memory
				},
				deviceId: node.deviceId
			};
		});

		const links: LabLink[] = [];

		for (const edge of lab.topology.edges) {
			const sourceId = nodeMap.get(edge.source);
			const targetId = nodeMap.get(edge.target);

			if (!sourceId || !targetId) continue;

			links.push({
				sourceId,
				sourceInterface: edge.sourceHandle,
				targetId,
				targetInterface: edge.targetHandle
			});
		}

		reply("message", "Deploying lab...");

		const { response } = await clab.deploy(labName, {
			sessionId,
			type: "user",
			id: labId,
			ownerId: session.id,
			nodes,
			links
		});

		if (!response.ok) {
			throw new Error("Error during lab provisioning");
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
		await clab.destroy(sessionId.replace(/-/g, ""));
		await sessionPromise;

		reply("message", "Lab stopped successfully.");
	}
};

export default labWSHandler;
