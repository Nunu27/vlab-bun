import EventEmitter from "node:events";
import db from "@manager/db";
import { labSessionNodes, labSessions } from "@manager/db/schema";
import baseLogger from "@manager/lib/logger";
import { cache } from "@manager/services/http/middlewares/caching";
import { labSessionQueue } from "@manager/services/queue/lab-session";
import ws from "@manager/services/ws";
import type { TempNodeEvents } from "@manager/types/clab";
import type { TypedEventEmitter } from "@manager/types/events";
import Debouncer from "@manager/utils/debouncer";
import Throttler from "@manager/utils/throttler";
import type { appRouter } from "@vlab/grpc";
import type { NodeHealth } from "@vlab/shared/enums";
import { eq } from "drizzle-orm";

const logger = baseLogger.child({ service: "monitor-grpc" });

export const tempNodeEvents: TypedEventEmitter<TempNodeEvents> =
	new EventEmitter();

const sessionThrottle = new Throttler(1000);
const interfaceDebounce = new Debouncer(750);

export async function submitActiveSession(id: string) {
	const now = new Date();
	const session = await db.transaction(async (tx) => {
		const session = await tx.query.labSessions.findFirst({
			columns: { id: true, labId: true, studentId: true },
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

		const checksObj = session.lab.checks;
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

	await cache.delete(
		`lab:${session.labId}:lab-session:${session.id}`,
		`lab:${session.labId}:lab-session:list:${session.studentId}`,
		`lab:${session.labId}:lab-session:${session.id}:node:*`,
	);

	logger.debug({ id }, "Session removed and submitted");
}

export function attachMonitorHandlers(
	workerId: string,
	client: ReturnType<typeof appRouter.buildClient>,
) {
	client.onData("monitor:snapshot", undefined, async (event) => {
		const { sessions, nodes } = event;
		const sessionIds = sessions.map((s) => s.id);

		const staleSessions = await db.query.labSessions.findMany({
			columns: { id: true },
			where: (labSessions, { eq, isNull, notInArray, and }) => {
				const conditions = [
					eq(labSessions.workerId, workerId),
					isNull(labSessions.submittedAt),
				];

				if (sessionIds.length) {
					conditions.push(notInArray(labSessions.id, sessionIds));
				}

				return and(...conditions);
			},
		});

		for (const { id } of staleSessions) {
			await sessionThrottle.run(id, () => submitActiveSession(id));
		}

		const updatedSessionIds = new Set<string>();

		for (const node of nodes) {
			const health =
				node.health === "none" ? null : (node.health as NodeHealth | null);
			const updated = await db
				.update(labSessionNodes)
				.set({
					health,
					interfaces: node.interfaces,
					containerId: node.containerId,
				})
				.where(eq(labSessionNodes.id, node.id))
				.returning({ labSessionId: labSessionNodes.labSessionId });

			if (updated.length) {
				updatedSessionIds.add(updated[0].labSessionId);
			}
		}

		if (updatedSessionIds.size > 0) {
			await cache.delete(
				...Array.from(updatedSessionIds).map((id) => `lab:*:lab-session:${id}`),
			);
		}

		logger.info(
			{ sessions: sessions.length, nodes: nodes.length },
			"Synchronized containerlab state",
		);
	});

	client.onData("monitor:session-create", undefined, async (event) => {
		const { id, ownerId, labId, labDue } = event;
		if (labId && labDue) {
			const now = new Date();
			const dueDate = new Date(Number(labDue));
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

				const delay = Math.max(0, dueDate.getTime() - Date.now());
				await labSessionQueue.add(
					"cleanup",
					{ sessionId: id, workerId },
					{ delay, jobId: id },
				);

				await cache.delete(`lab:${labId}:lab-session:list:${ownerId}`);
			});
		}
	});

	client.onData("monitor:session-remove", undefined, async (event) => {
		const id = event.sessionId;
		await sessionThrottle.run(id, () => submitActiveSession(id));
		ws.server.emit(
			"lab-session:[sessionId]:ended",
			{ sessionId: id },
			undefined,
		);
	});

	client.onData("monitor:node-create", undefined, async (event) => {
		const { labSessionId, labNodeId, deviceTemplateId, ...node } = event;
		const health =
			node.health === "none" ? null : (node.health as NodeHealth | null);

		if (labNodeId && deviceTemplateId) {
			await sessionThrottle.wait(labSessionId);
			await db.insert(labSessionNodes).values({
				labSessionId,
				labNodeId,
				deviceTemplateId,
				...node,
				health,
			});

			await cache.delete(`lab:*:lab-session:${labSessionId}`);
		} else {
			tempNodeEvents.emit(`${node.id}:health`, health);
			tempNodeEvents.emit(`${node.id}:ip`, node.ip);
		}
	});

	client.onData("monitor:node-health", undefined, async (event) => {
		const { node, isTemp } = event;
		const health =
			node.health === "none" ? null : (node.health as NodeHealth | null);

		await sessionThrottle.wait(node.labSessionId, {
			id: "health",
			execute: async () => {
				await db
					.update(labSessionNodes)
					.set({ health })
					.where(eq(labSessionNodes.id, node.id));

				await cache.delete(`lab:*:lab-session:${node.labSessionId}`);
			},
		});
		if (!isTemp) ws.server.emit("node:[id]:health", { id: node.id }, health);
		else tempNodeEvents.emit(`${node.id}:health`, health);
	});

	client.onData("monitor:interface-update", undefined, async (event) => {
		const { node } = event;

		for (const [iface, ips] of Object.entries(node.interfaces)) {
			ws.server.emit(
				"node:[id]:interfaces:[interface]",
				{ id: node.id, interface: iface },
				ips,
			);
		}

		interfaceDebounce.run(node.id, async () => {
			await db
				.update(labSessionNodes)
				.set({ interfaces: node.interfaces })
				.where(eq(labSessionNodes.id, node.id));

			await cache.delete(`lab:*:lab-session:${node.labSessionId}`);
		});
	});

	client.onData("monitor:node-remove", undefined, async (event) => {
		const { id, isTemp } = event;
		if (!isTemp) return;

		tempNodeEvents.emit(`${id}:health`, "deleted");
	});
}
