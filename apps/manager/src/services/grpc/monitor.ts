import EventEmitter from "node:events";
import db from "@manager/db";
import { labSessionNodes, labSessions } from "@manager/db/schema";
import baseLogger from "@manager/lib/logger";
import ws from "@manager/services/ws";
import Debouncer from "@manager/utils/debouncer";
import Throttler from "@manager/utils/throttler";
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

export async function handleStaleSession(workerId: string, sessionId: string) {
	try {
		logger.warn({ sessionId }, "Destroying stale session");
		sendCommandToWorker(workerId, "clab:destroyLab", { sessionId });
	} catch (err) {
		logger.error({ err }, "Failed to process stale-session event");
	}
}

export async function handleSnapshot(
	_workerId: string,
	sessions: { id: string }[],
	nodes: {
		id: string;
		health: string;
		interfaces: Record<string, unknown>;
		containerId: string;
	}[],
) {
	try {
		const sessionIds = sessions.map((s) => s.id);
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
					health: node.health as "healthy" | "unhealthy" | "starting" | null,
					interfaces: node.interfaces as Record<string, string[]>,
					containerId: node.containerId,
				})
				.where(eq(labSessionNodes.id, node.id));
		}
		logger.info(
			{ sessions: sessions.length, nodes: nodes.length },
			"Synchronized containerlab state",
		);
	} catch (err) {
		logger.error({ err }, "Failed to process snapshot event");
	}
}

export async function handleSessionCreate(
	workerId: string,
	id: string,
	ownerId: string,
	labId: string,
	labDue: string | number,
) {
	try {
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
			});
		}
	} catch (err) {
		logger.error({ err }, "Failed to process session-create event");
	}
}

export async function handleSessionRemove(_workerId: string, id: string) {
	try {
		await sessionThrottle.run(id, () => submitActiveSession(id));
		ws.server.emit(
			"lab-session:[sessionId]:ended",
			{ sessionId: id },
			undefined,
		);
	} catch (err) {
		logger.error({ err }, "Failed to process session-remove event");
	}
}

export async function handleNodeCreate(
	_workerId: string,
	labNodeId: string,
	deviceTemplateId: string,
	labSessionId: string,
	node: any,
) {
	try {
		if (labNodeId && deviceTemplateId) {
			await sessionThrottle.wait(labSessionId);
			await db
				.insert(labSessionNodes)
				.values({ labSessionId, labNodeId, deviceTemplateId, ...node });
		}
	} catch (err) {
		logger.error({ err }, "Failed to process node-create event");
	}
}

export async function handleNodeHealth(
	_workerId: string,
	node: { id: string; health: string; labSessionId: string },
	isTemp: boolean,
) {
	try {
		if (!isTemp)
			ws.server.emit("node:[id]:health", { id: node.id }, node.health as any);
		await sessionThrottle.wait(node.labSessionId, {
			id: "health",
			execute: async () => {
				await db
					.update(labSessionNodes)
					.set({ health: node.health as any })
					.where(eq(labSessionNodes.id, node.id));
			},
		});
		if (!isTemp)
			ws.server.emit("node:[id]:health", { id: node.id }, node.health as any);
		else tempNodeEvents.emit(`${node.id}:health`, node.health);
	} catch (err) {
		logger.error({ err }, "Failed to process node-health event");
	}
}

export async function handleInterfaceUpdate(
	_workerId: string,
	node: {
		id: string;
		interfaces: Record<string, unknown>;
		labSessionId: string;
	},
	isTemp: boolean,
) {
	try {
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
				.set({ interfaces: node.interfaces as Record<string, string[]> })
				.where(eq(labSessionNodes.id, node.id));
		});
	} catch (err) {
		logger.error({ err }, "Failed to process interface-update event");
	}
}
