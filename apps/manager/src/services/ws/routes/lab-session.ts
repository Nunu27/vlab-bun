import db from "@manager/db";
import { labSessions } from "@manager/db/schema";
import {
	getAvailableWorkerId,
	sendCommandToWorker,
} from "@manager/services/grpc";
import {
	startLabEvaluation,
	stopLabEvaluation,
} from "@manager/services/grpc/evaluator";
import ws from "@manager/services/ws";
import type { LabLink, LabNode } from "@manager/types/clab";
import { eq } from "drizzle-orm";

ws.server.on("lab:[id]:init", async (ctx) => {
	const { id } = ctx.params;
	console.log("Initializing lab session for lab", id);
	const userId = ctx.context.session.id;

	ctx.reply("info", "Getting lab configuration...");

	const lab = await db.query.labs.findFirst({
		columns: {
			isPublished: true,
			topology: true,
			maxAttempt: true,
			sessionDuration: true,
			startAt: true,
			endAt: true,
		},
		where: (lab, { eq }) => eq(lab.id, id),
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
	if (!lab.isPublished) throw new Error("Lab is not published");
	if (!lab.enrollments.length) throw new Error("Not enrolled");

	const now = Date.now();
	if (now < lab.startAt.getTime()) throw new Error("Lab has not started yet");
	if (now >= lab.endAt.getTime()) throw new Error("Lab has ended");

	const existingSession = lab.sessions.find(({ submittedAt }) => !submittedAt);

	if (existingSession) {
		ctx.reply("id", existingSession.id);
		return;
	} else if (lab.maxAttempt && lab.sessions.length >= lab.maxAttempt) {
		throw new Error("Max attempts reached");
	}

	ctx.reply("info", "Building lab configuration...");

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

	ctx.reply("info", "Provisioning lab...");

	const sessionDurationMs = lab.sessionDuration * 60 * 1000;
	const dueDate = Math.min(Date.now() + sessionDurationMs, lab.endAt.getTime());

	let workerId: string;
	try {
		workerId = await getAvailableWorkerId();
	} catch (_err) {
		throw new Error("No online workers available to run this lab.");
	}

	sendCommandToWorker(workerId, "clab:deployLab", {
		sessionId: sessionId,
		config: {
			labId: id,
			ownerId: userId,
			nodes,
			links,
			dueDate,
		},
	});

	ctx.reply("info", "Lab provisioned successfully.");
	ctx.reply("id", sessionId);
});

// Since Waycast does not give access to the socket connection ID intrinsically,
// we map requestId to connection in onDispose, but the lab session uses the connection
// ID as the clientId to ensure only one user is connected to a session.
// We will store the requestId as clientId for now.
const activeSessionConnections = new Map<string, string>(); // requestId -> sessionId

ws.server.on("lab-session:[sessionId]:connect", async (ctx) => {
	const { sessionId } = ctx.params;
	const force = ctx.payload;

	const session = await db.query.labSessions.findFirst({
		columns: { clientId: true, labId: true },
		where: (session, { eq, and, isNull }) => {
			return and(
				eq(session.id, sessionId),
				eq(session.studentId, ctx.context.session.id),
				isNull(session.submittedAt),
			);
		},
	});

	if (!session) throw new Error("Session not found");
	if (!force && session.clientId && session.clientId !== ctx.requestId) {
		ctx.reply("conflict", true);
		return;
	}

	ws.server.emit(
		"lab-session:[sessionId]:client-change",
		{ sessionId },
		ctx.requestId,
	);

	await db
		.update(labSessions)
		.set({ clientId: ctx.requestId })
		.where(eq(labSessions.id, sessionId));

	activeSessionConnections.set(ctx.requestId, sessionId);
	ctx.reply("conflict", false);

	await startLabEvaluation(sessionId, session.labId);
});

ws.server.onDispose("lab-session:[sessionId]:connect", async (requestId) => {
	const sessionId = activeSessionConnections.get(requestId);
	if (!sessionId) return;

	activeSessionConnections.delete(requestId);

	const [data] = await db
		.update(labSessions)
		.set({ clientId: null })
		.where(eq(labSessions.clientId, requestId))
		.returning({ id: labSessions.id });

	if (data) {
		ws.server.emit(
			"lab-session:[sessionId]:client-change",
			{ sessionId: data.id },
			null,
		);
		stopLabEvaluation(data.id);
	}
});

ws.server.on("lab-session:[sessionId]:submit", async (ctx) => {
	const { sessionId } = ctx.params;
	const session = await db.query.labSessions.findFirst({
		columns: { id: true, workerId: true },
		where: (session, { eq, and, isNull }) => {
			return and(
				eq(session.id, sessionId),
				eq(session.studentId, ctx.context.session.id),
				isNull(session.submittedAt),
			);
		},
	});

	if (!session) throw new Error("Session not found");

	sendCommandToWorker(session.workerId, "clab:destroyLab", { sessionId });
});
