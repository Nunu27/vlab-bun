import db from "@api/db";
import { labSessions } from "@api/db/schema";
import clab from "@api/services/clab";
import { startLabEvaluation, stopLabEvaluation } from "@api/services/evaluator";
import { clabMonitor } from "@api/services/events";
import ws from "@api/services/ws";
import type { LabLink, LabNode } from "@api/types/clab";
import evaluator from "@vlab/evaluator";
import { eq } from "drizzle-orm";

// Lab Sessions event
ws.server.on("lab:[id]:init", async ({ params: { id }, socket, reply }) => {
	const userId = socket.data.session.id;

	const lab = await db.query.labs.findFirst({
		columns: { topology: true },
		where: (lab, { eq, and }) => and(eq(lab.id, id), eq(lab.isPublished, true)),
		with: {
			enrollments: {
				columns: { labId: true },
				where: (enrollment, { eq }) => {
					return eq(enrollment.studentId, userId);
				},
			},
			sessions: {
				columns: { id: true },
				where: (session, { eq }) => eq(session.studentId, userId),
			},
		},
	});

	if (!lab) throw new Error("Lab not found");
	if (!lab.enrollments.length) throw new Error("Not enrolled");
	if (lab.sessions.length) return reply("id", lab.sessions[0].id);

	reply("info", "Building lab configuration...");

	const sessionId = Bun.randomUUIDv7();
	const devices = Object.entries(lab.topology.devices);

	const deviceIds = new Set(devices.map(([_, { deviceId }]) => deviceId));
	if (!deviceIds.size) throw new Error("No devices in lab topology");

	const templates = await db.query.deviceTemplates.findMany({
		where: (template, { inArray }) =>
			inArray(template.id, Array.from(deviceIds)),
	});
	const templatesMap = new Map(templates.map((d) => [d.id, d]));

	const nodes: LabNode[] = devices.map(([id, device]) => {
		const template = templatesMap.get(device.deviceId);
		if (!template) {
			throw new Error(`Device template not found for ${device.deviceId}`);
		}

		return {
			id: Bun.randomUUIDv7(),
			labNodeId: id,
			name: device.name,
			kind: template.kind,
			image: template.image,
			env: template.env,
			resources: {
				cpu: device.resources?.cpu || template.resources.cpu,
				memory: device.resources?.memory || template.resources.memory,
			},
			deviceId: device.deviceId,
		};
	});

	const links: LabLink[] = [];

	Object.values(lab.topology.edges).forEach(([source, target]) => {
		links.push({
			sourceId: source.deviceId,
			sourceInterface: source.interface,
			targetId: target.deviceId,
			targetInterface: target.interface,
		});
	});

	reply("info", "Provisioning lab...");

	const { response } = await clab.deployLab(sessionId, {
		labId: id,
		ownerId: userId,
		nodes,
		links,
	});

	if (!response.ok) {
		throw new Error("Error during lab provisioning");
	}

	reply("info", "Lab provisioned successfully.");
	reply("id", sessionId);
});

ws.server.on(
	"lab-session:[sessionId]:connect",
	async ({ params: { sessionId }, data: force, socket, reply }) => {
		const session = await db.query.labSessions.findFirst({
			where: (session, { eq }) => eq(session.id, sessionId),
			with: {
				lab: true,
				nodes: true,
			},
		});

		if (!session) throw new Error("Session not found");

		if (!force && session.clientId && session.clientId !== socket.id) {
			return reply("conflict", true);
		}

		await db
			.update(labSessions)
			.set({ clientId: socket.id })
			.where(eq(labSessions.id, sessionId));
		reply("conflict", false);

		await startLabEvaluation(sessionId, {
			instructions: session.lab.instructions,
			nodes: session.nodes,
		});
	},
);

ws.server.onDispose("lab-session:[sessionId]:connect", async ({ socketId }) => {
	const [data] = await db
		.update(labSessions)
		.set({ clientId: null })
		.where(eq(labSessions.clientId, socketId))
		.returning({ id: labSessions.id });

	if (data) {
		ws.server.emit("lab-session:[sessionId]:session-change", {
			params: { sessionId: data.id },
		});
		stopLabEvaluation(data.id);
	}
});

// Node events
clabMonitor.emitter.on("node-health", ({ id, health }, isTemp) => {
	if (isTemp) return;

	ws.server.emit("node:[id]:health", { params: { id }, data: health });
});

clabMonitor.emitter.on("interface-update", ({ id, interfaces }) => {
	ws.server.emit("node:[id]:interfaces", {
		params: { id },
		data: interfaces,
	});

	for (const [iface, ips] of Object.entries(interfaces)) {
		if (ips.length > 0) {
			evaluator.emit(
				"node-interface.interface-ip",
				id,
				{ interface: iface },
				ips,
			);
		}
	}
});
