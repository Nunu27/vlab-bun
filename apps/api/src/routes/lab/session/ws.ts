import db from "@api/db";
import { labSessions } from "@api/db/schema";
import clab, { destroyLab } from "@api/services/clab";
import { startLabEvaluation, stopLabEvaluation } from "@api/services/evaluator";
import { clabMonitor } from "@api/services/events";
import ws from "@api/services/ws";
import type { LabLink, LabNode } from "@api/types/clab";
import evaluator from "@vlab/evaluator";
import { eq } from "drizzle-orm";

ws.server.on("lab:[id]:init", async ({ params: { id }, socket, reply }) => {
	const userId = socket.data.session.id;

	const lab = await db.query.labs.findFirst({
		columns: {
			topology: true,
			maxAttempt: true,
			sessionDuration: true,
			endAt: true,
		},
		where: (lab, { eq, and }) => and(eq(lab.id, id), eq(lab.isPublished, true)),
		with: {
			enrollments: {
				columns: { labId: true },
				where: (enrollment, { eq }) => eq(enrollment.studentId, userId),
			},
			sessions: {
				columns: { id: true, submittedAt: true },
				where: (session, { eq }) => eq(session.studentId, userId),
			},
		},
	});

	if (!lab) throw new Error("Lab not found");
	if (!lab.enrollments.length) throw new Error("Not enrolled");

	const existingSession = lab.sessions.find(({ submittedAt }) => !submittedAt);

	if (existingSession) return reply("id", existingSession.id);
	else if (lab.maxAttempt && lab.sessions.length >= lab.maxAttempt) {
		throw new Error("Max attempts reached");
	}

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

	const sessionDurationMs = lab.sessionDuration * 60 * 1000;
	const dueDate = Math.min(Date.now() + sessionDurationMs, lab.endAt.getTime());

	const { response } = await clab.deployLab(sessionId, {
		labId: id,
		ownerId: userId,
		nodes,
		links,
		dueDate,
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
			columns: { clientId: true, labId: true },
			where: (session, { eq, and, isNull }) => {
				return and(
					eq(session.id, sessionId),
					eq(session.studentId, socket.data.session.id),
					isNull(session.submittedAt),
				);
			},
		});

		if (!session) throw new Error("Session not found");
		if (
			!force &&
			session.clientId &&
			ws.io.sockets.sockets.has(session.clientId) &&
			session.clientId !== socket.id
		) {
			return reply("conflict", true);
		}

		ws.server.emit("lab-session:[sessionId]:client-change", {
			params: { sessionId },
			data: socket.id,
		});

		await db
			.update(labSessions)
			.set({ clientId: socket.id })
			.where(eq(labSessions.id, sessionId));
		reply("conflict", false);

		await startLabEvaluation(sessionId, session.labId);
	},
);

ws.server.onDispose("lab-session:[sessionId]:connect", async ({ socketId }) => {
	const [data] = await db
		.update(labSessions)
		.set({ clientId: null })
		.where(eq(labSessions.clientId, socketId))
		.returning({ id: labSessions.id });

	if (data) {
		ws.server.emit("lab-session:[sessionId]:client-change", {
			params: { sessionId: data.id },
			data: null,
		});

		stopLabEvaluation(data.id);
	}
});

clabMonitor.emitter.on("node-health", ({ id, health }, isTemp) => {
	if (isTemp) return;

	ws.server.emit("node:[id]:health", { params: { id }, data: health });
});

clabMonitor.emitter.on("interface-update", ({ id, interfaces }) => {
	evaluator.emitSource(id, "node-interface.interfaces-ip", interfaces);

	for (const [iface, ips] of Object.entries(interfaces)) {
		ws.server.emit("node:[id]:interfaces:[interface]", {
			params: { id, interface: iface },
			data: ips,
		});
	}
});

clabMonitor.emitter.on("session-remove", (sessionId) => {
	ws.server.emit("lab-session:[sessionId]:ended", {
		params: { sessionId },
	});
});

ws.server.on(
	"lab-session:[sessionId]:submit",
	async ({ params: { sessionId }, socket }) => {
		const session = await db.query.labSessions.findFirst({
			columns: { id: true },
			where: (session, { eq, and, isNull }) => {
				return and(
					eq(session.id, sessionId),
					eq(session.studentId, socket.data.session.id),
					isNull(session.submittedAt),
				);
			},
		});

		if (!session) throw new Error("Session not found");

		destroyLab(sessionId);
	},
);
