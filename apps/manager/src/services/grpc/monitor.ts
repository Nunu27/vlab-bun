import EventEmitter from "node:events";
import db from "@manager/db";
import { labSessionNodes, labSessions } from "@manager/db/schema";
import baseLogger from "@manager/lib/logger";
import ws from "@manager/services/ws";
import Debouncer from "@manager/utils/debouncer";
import Throttler from "@manager/utils/throttler";
import type { MonitorProto } from "@vlab/grpc";
import { eq } from "drizzle-orm";
import { sendCommandToWorker } from "./worker";

const logger = baseLogger.child({ service: "monitor-grpc" });

export const tempNodeEvents = new EventEmitter();

const sessionThrottle = new Throttler(1000);
const interfaceDebounce = new Debouncer(750);

async function submitActiveSession(id: string) {
	const now = new Date();
	const session = await db.transaction(async (tx) => {
		const session = await tx.query.labSessions.findFirst({
			columns: { labId: true, studentId: true },
			where: (labSessions, { eq, and, isNull }) =>
				and(eq(labSessions.id, id), isNull(labSessions.submittedAt)),
			with: {
				lab: { columns: { checks: true } },
				checks: { columns: { checkId: true, completed: true } },
			},
		});
		if (!session) return null;

		const passed = new Set<string>();
		session.checks.forEach((check) => {
			if (check.completed) passed.add(check.checkId);
		});

		const checksObj = session.lab.checks as Record<string, { weight: number }>;
		const totalWeight = Object.values(checksObj).reduce(
			(acc: number, check) => acc + check.weight,
			0,
		);
		let completedWeight = 0;
		passed.forEach((checkId) => {
			completedWeight += checksObj[checkId]?.weight ?? 0;
		});

		await tx
			.update(labSessions)
			.set({
				score: Math.round((completedWeight / totalWeight) * 100).toString(),
				submittedAt: now,
			})
			.where(eq(labSessions.id, id));
		await tx
			.delete(labSessionNodes)
			.where(eq(labSessionNodes.labSessionId, id));
		return session;
	});
	if (!session) return;
	logger.debug({ id }, "Session removed and submitted");
}

export const MonitorServiceImpl: MonitorProto.MonitorServiceImplementation = {
	async streamMonitorEvents(request, context) {
		for await (const event of request) {
			try {
				const payload = JSON.parse(event.payload);
				const type = event.type;

				if (type === "stale-session") {
					const sessionId = payload[0];
					logger.warn({ sessionId }, "Destroying stale session");
					// Fire and forget via routing
					const workerId = context.metadata.get("worker-id") || "worker-1";
					sendCommandToWorker(workerId as string, "clab:destroyLab", {
						sessionId,
					});
				} else if (type === "snapshot") {
					const { sessions, nodes } = payload[0];
					const sessionIds = sessions.map((s: { id: string }) => s.id);
					const staleSessions = await db.query.labSessions.findMany({
						columns: { id: true },
						where: (labSessions, { isNull, notInArray, and }) => {
							if (sessionIds.length > 0)
								return and(
									isNull(labSessions.submittedAt),
									notInArray(labSessions.id, sessionIds),
								);
							return isNull(labSessions.submittedAt);
						},
					});
					for (const { id } of staleSessions)
						await sessionThrottle.run(id, () => submitActiveSession(id));
					for (const node of nodes) {
						await db
							.update(labSessionNodes)
							.set({
								health: node.health,
								interfaces: node.interfaces,
								containerId: node.containerId,
							})
							.where(eq(labSessionNodes.id, node.id));
					}
					logger.info(
						{ sessions: sessions.length, nodes: nodes.length },
						"Synchronized containerlab state",
					);
				} else if (type === "session-create") {
					const { id, ownerId, labId, labDue } = payload[0];
					if (labId && labDue) {
						const now = new Date();
						const dueDate = new Date(Number(labDue));
						const workerId = context.metadata.get("worker-id") as string;
						sessionThrottle.run(id, async () => {
							await db
								.insert(labSessions)
								.values({
									id,
									labId,
									studentId: ownerId,
									workerId,
									dueDate,
									createdAt: now,
									updatedAt: now,
								})
								.onConflictDoNothing();
						});
					}
				} else if (type === "session-remove") {
					const id = payload[0];
					await sessionThrottle.run(id, () => submitActiveSession(id));
					ws.server.emit(
						"lab-session:[sessionId]:ended",
						{ sessionId: id },
						undefined,
					);
				} else if (type === "node-create") {
					const { labNodeId, deviceTemplateId, ...node } = payload[0];
					if (labNodeId && deviceTemplateId) {
						await sessionThrottle.wait(node.labSessionId);
						await db
							.insert(labSessionNodes)
							.values({ labNodeId, deviceTemplateId, ...node });
					}
				} else if (type === "node-health") {
					const node = payload[0];
					const isTemp = payload[1];
					if (!isTemp)
						ws.server.emit("node:[id]:health", { id: node.id }, node.health);
					await sessionThrottle.wait(node.labSessionId, {
						id: "health",
						execute: async () => {
							await db
								.update(labSessionNodes)
								.set({ health: node.health })
								.where(eq(labSessionNodes.id, node.id));
						},
					});
					if (!isTemp)
						ws.server.emit("node:[id]:health", { id: node.id }, node.health);
					else tempNodeEvents.emit(`${node.id}:health`, node.health);
				} else if (type === "interface-update") {
					const node = payload[0];
					const isTemp = payload[1];
					if (!isTemp) {
						for (const [iface, ips] of Object.entries(node.interfaces)) {
							ws.server.emit(
								"node:[id]:interfaces:[interface]",
								{ id: node.id, interface: iface },
								ips as string[],
							);
						}
					}
					tempNodeEvents.emit(
						`${node.id}:ip`,
						Object.values(node.interfaces).flat()[0] as string,
					);
					interfaceDebounce.run(node.id, async () => {
						await db
							.update(labSessionNodes)
							.set({ interfaces: node.interfaces })
							.where(eq(labSessionNodes.id, node.id));
					});
				}
			} catch (err) {
				logger.error({ err }, "Failed to process monitor event");
			}
		}
		return {};
	},
};
