import db from "@manager/db";
import { labSessions } from "@manager/db/schema";
import {
	DEFAULT_CPU_COST_CORES,
	DEFAULT_MEMORY_COST_MB,
	dispatchWorkerAction,
	waitForAvailableWorkerId,
} from "@manager/services/grpc";
import ws from "@manager/services/ws";
import type { LabLink, LabNode } from "@manager/types/clab";
import { eq } from "drizzle-orm";

ws.server.on(
	"lab:[id]:init",
	async ({ params: { id: labId }, context, requestId, reply }) => {
		const userId = context.session.id;

		reply("info", "Getting lab configuration...");

		const lab = await db.query.labs.findFirst({
			columns: {
				isPublished: true,
				topology: true,
				maxAttempt: true,
				sessionDuration: true,
				startAt: true,
				endAt: true,
			},
			where: (l, { eq }) => eq(l.id, labId),
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

		const existingSession = lab.sessions.find(
			({ submittedAt }) => !submittedAt,
		);

		if (existingSession) return existingSession.id;
		if (lab.maxAttempt && lab.sessions.length >= lab.maxAttempt) {
			throw new Error("Max attempts reached");
		}

		reply("info", "Building lab configuration...");

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
				credentials: {
					username:
						device.credentials?.username || template.connection.data.username,
					password:
						device.credentials?.password || template.connection.data.password,
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

		let totalCpuCost = 0;
		let totalMemoryCost = 0;
		for (const device of Object.values(lab.topology.devices)) {
			const tmpl = templatesMap.get(device.deviceId);
			totalCpuCost += tmpl?.cpuCostCores ?? DEFAULT_CPU_COST_CORES;
			totalMemoryCost += tmpl?.memoryCostMB ?? DEFAULT_MEMORY_COST_MB;
		}

		const sessionDurationMs = lab.sessionDuration * 60 * 1000;
		const dueDate = Math.min(
			Date.now() + sessionDurationMs,
			lab.endAt.getTime(),
		);
		const sessionId = Bun.randomUUIDv7();

		const workerId = await waitForAvailableWorkerId(
			totalCpuCost,
			totalMemoryCost,
			{
				onWait: (attempt) => {
					if (attempt === 1) {
						reply(
							"warn",
							"High demand: waiting for an available worker node...",
						);
					}
				},
			},
		);

		reply("info", "Provisioning lab...");

		await dispatchWorkerAction("lab:initSession", workerId, {
			requestId,
			sessionId,
			labId,
			userId,
			nodes,
			links,
			dueDate,
		});

		return ws.server.defer;
	},
);

ws.server.on(
	"lab-session:[sessionId]:connect",
	async ({ params: { sessionId }, payload: force, connectionId, context }) => {
		const session = await db.query.labSessions.findFirst({
			columns: { clientId: true, labId: true, workerId: true },
			where: (session, { eq, and, isNull }) => {
				return and(
					eq(session.id, sessionId),
					eq(session.studentId, context.session.id),
					isNull(session.submittedAt),
				);
			},
		});

		if (!session) throw new Error("Session not found");
		if (!force && session.clientId && session.clientId !== connectionId) {
			return true;
		}

		ws.server.emit("lab-session:[sessionId]:client-change", {
			params: { sessionId },
			data: connectionId,
		});

		await db
			.update(labSessions)
			.set({ clientId: connectionId })
			.where(eq(labSessions.id, sessionId));

		await dispatchWorkerAction("evaluator:start", session.workerId, {
			sessionId,
			labId: session.labId,
		});

		return false;
	},
);

ws.server.onDispose("lab-session:[sessionId]:connect", async (connectionId) => {
	const [data] = await db
		.update(labSessions)
		.set({ clientId: null })
		.where(eq(labSessions.clientId, connectionId))
		.returning({ id: labSessions.id, workerId: labSessions.workerId });
	if (!data) return;

	ws.server.emit("lab-session:[sessionId]:client-change", {
		params: { sessionId: data.id },
		data: null,
	});

	await dispatchWorkerAction("evaluator:stop", data.workerId, {
		sessionId: data.id,
	});
});
