import db from "@manager/db";
import { labSessions, workers } from "@manager/db/schema";
import { sendCommandToWorker } from "@manager/services/grpc";
import ws from "@manager/services/ws";
import type { LabLink, LabNode } from "@manager/types/clab";
import { eq, sql } from "drizzle-orm";

export async function handleInitLabSession(
	workerId: string,
	payload: {
		connectionId: string;
		requestId: string;
		labId: string;
		userId: string;
	},
) {
	const labId = payload.labId;
	const userId = payload.userId;
	const reply = ws.server.reply("lab:[id]:init", payload.requestId);

	try {
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
			where: (lab, { eq }) => eq(lab.id, labId),
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

		if (existingSession) {
			ws.server.replyResponse(
				"lab:[id]:init",
				payload.requestId,
				existingSession.id,
			);
			return;
		} else if (lab.maxAttempt && lab.sessions.length >= lab.maxAttempt) {
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

		reply("info", "Provisioning lab...");

		const sessionDurationMs = lab.sessionDuration * 60 * 1000;
		const dueDate = Math.min(
			Date.now() + sessionDurationMs,
			lab.endAt.getTime(),
		);

		try {
			await sendCommandToWorker(workerId, "clab:deployLab", {
				sessionId: sessionId,
				config: {
					labId: labId,
					ownerId: userId,
					nodes,
					links,
					dueDate,
				},
			});
		} catch (deployError) {
			// Delete any session record the monitor may have created for the partial deployment
			await db
				.delete(labSessions)
				.where(eq(labSessions.id, sessionId))
				.catch(() => {});
			throw deployError;
		}

		reply("info", "Lab provisioned successfully.");
		ws.server.replyResponse("lab:[id]:init", payload.requestId, sessionId);
	} catch (error) {
		await db
			.update(workers)
			.set({ activeLabs: sql`GREATEST(${workers.activeLabs} - 1, 0)` })
			.where(eq(workers.id, workerId));

		ws.server.replyError(
			"lab:[id]:init",
			payload.requestId,
			error instanceof Error ? error.message : String(error),
		);
		throw error;
	}
}

export async function handleSubmitLabSession(
	workerId: string,
	payload: {
		sessionId: string;
	},
) {
	await sendCommandToWorker(workerId, "clab:destroyLab", {
		sessionId: payload.sessionId,
	});
}
