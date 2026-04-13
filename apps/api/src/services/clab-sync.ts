import db from "@api/db";
import { labSessionNodes, labSessions } from "@api/db/schema";
import { cache } from "@api/middlewares/caching";
import baseLogger from "@api/services/logger";
import Debouncer from "@api/utils/debouncer";
import Throttler from "@api/utils/throttler";
import { eq } from "drizzle-orm";
import { destroyLab } from "./clab";
import { clabMonitor, tempNodeEvents } from "./events";

const logger = baseLogger.child({ service: "clab-sync" });

const sessionThrottle = new Throttler(1000);
const interfaceDebounce = new Debouncer(750);

const { emitter, init } = clabMonitor;

async function submitActiveSession(id: string) {
	const now = new Date();

	const session = await db.transaction(async (tx) => {
		const session = await tx.query.labSessions.findFirst({
			columns: { labId: true, studentId: true },
			where: (labSessions, { eq, and, isNull }) => {
				return and(eq(labSessions.id, id), isNull(labSessions.submittedAt));
			},
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

		const totalWeight = Object.values(session.lab.checks).reduce(
			(acc, check) => acc + check.weight,
			0,
		);
		let completedWeight = 0;

		passed.forEach((checkId) => {
			completedWeight += session.lab.checks[checkId].weight;
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
		`lab:pagination:*:${session.studentId}`,
		`lab:${session.labId}:lab-session:${id}`,
	);

	logger.debug({ id }, "Session removed and submitted");
}

emitter.on("stale-session", async (sessionId) => {
	logger.warn({ sessionId }, "Destroying stale session");
	try {
		await destroyLab(sessionId);
	} catch (error) {
		logger.error({ error, sessionId }, "Failed to destroy stale session");
	}
});

emitter.on("snapshot", async ({ sessions, nodes }) => {
	const sessionIds = sessions.map((s) => s.id);

	const staleSessions = await db.query.labSessions.findMany({
		columns: { id: true },
		where: (labSessions, { isNull, notInArray, and }) => {
			if (sessionIds.length > 0) {
				return and(
					isNull(labSessions.submittedAt),
					notInArray(labSessions.id, sessionIds),
				);
			}
			return isNull(labSessions.submittedAt);
		},
	});

	for (const { id } of staleSessions) {
		await sessionThrottle.run(id, () => submitActiveSession(id));
	}

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
		"Synchronized containerlab state to database",
	);
});

emitter.on("session-create", ({ id, ownerId, labId, labDue }) => {
	if (!labId || !labDue) return;

	const now = new Date();
	const due = Number(labDue);
	const dueDate = new Date(due);

	sessionThrottle.run(id, async () => {
		await db
			.insert(labSessions)
			.values({
				id,
				labId,
				studentId: ownerId,
				dueDate,
				createdAt: now,
				updatedAt: now,
			})
			.onConflictDoNothing();
		await cache.delete(`lab:pagination:*:${ownerId}`);

		logger.debug({ id }, "Session created");
	});
});

emitter.on("session-remove", async (id) => {
	await sessionThrottle.run(id, () => submitActiveSession(id));
});

emitter.on("node-create", async ({ labNodeId, deviceTemplateId, ...node }) => {
	if (labNodeId && deviceTemplateId) {
		await sessionThrottle.wait(node.labSessionId);
		await db
			.insert(labSessionNodes)
			.values({ labNodeId, deviceTemplateId, ...node });
	} else {
		tempNodeEvents.emit(`${node.id}:health`, node.health);
		tempNodeEvents.emit(`${node.id}:ip`, node.ip);
	}

	logger.debug({ nodeId: node.id }, "Node created");
});

emitter.on("node-remove", async (id, isTemp) => {
	if (!isTemp) return;

	tempNodeEvents.emit(`${id}:health`, "deleted");
});

emitter.on("node-health", async (node, isTemp) => {
	if (isTemp) tempNodeEvents.emit(`${node.id}:health`, node.health);

	await sessionThrottle.wait(node.labSessionId, {
		id: "health",
		execute: async () => {
			await db
				.update(labSessionNodes)
				.set({ health: node.health })
				.where(eq(labSessionNodes.id, node.id));

			await cache.delete(`lab:*:session:${node.labSessionId}`);

			logger.debug(
				{ nodeId: node.id, health: node.health },
				"Node health updated",
			);
		},
	});
});

emitter.on("interface-update", (node, isTemp) => {
	if (isTemp) return;

	interfaceDebounce.run(node.id, async () => {
		await db
			.update(labSessionNodes)
			.set({ interfaces: node.interfaces })
			.where(eq(labSessionNodes.id, node.id));

		await cache.delete(`lab:*:session:${node.labSessionId}`);

		logger.debug({ nodeId: node.id }, "Node interfaces updated");
	});
});

export const initClabSync = init;
