import db from "@api/db";
import { labSessionNodes, labSessions } from "@api/db/schema";
import { cache } from "@api/middlewares/caching";
import baseLogger from "@api/services/logger";
import Debouncer from "@api/utils/debouncer";
import Throttler from "@api/utils/throttler";
import { eq, notInArray } from "drizzle-orm";
import { destroyLab } from "./clab";
import { clabMonitor, tempNodeEvents } from "./events";

const logger = baseLogger.child({ service: "clab-sync" });

const sessionThrottle = new Throttler(1000);
const interfaceDebounce = new Debouncer(750);

const { emitter, init } = clabMonitor;

// Stale sessions
emitter.on("stale-session", async (sessionId) => {
	logger.warn({ sessionId }, "Destroying stale session");
	try {
		await destroyLab(sessionId);
	} catch (error) {
		logger.error({ error, sessionId }, "Failed to destroy stale session");
	}
});

// Snapshot
emitter.on("snapshot", async ({ sessions, nodes }) => {
	const sessionIds = sessions.map((s) => s.id);

	// Remove sessions no longer running
	if (sessionIds.length) {
		await db.delete(labSessions).where(notInArray(labSessions.id, sessionIds));
	} else {
		await db.delete(labSessions);
	}

	// Sync health/interfaces/containerId onto existing rows
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

// Session lifecycle
emitter.on("session-create", ({ ownerId, labId, ...session }) => {
	sessionThrottle.run(session.id, async () => {
		await db
			.insert(labSessions)
			.values({
				labId,
				studentId: ownerId,
				...session,
			})
			.onConflictDoNothing();
		await cache.delete(`lab:pagination:*:${ownerId}`);

		logger.debug({ id: session.id }, "Session created");
	});
});

emitter.on("session-remove", async (id) => {
	sessionThrottle.run(id, async () => {
		const [session] = await db
			.delete(labSessions)
			.where(eq(labSessions.id, id))
			.returning({
				studentId: labSessions.studentId,
			});
		if (!session) return;

		await cache.delete(
			`lab:pagination:*:${session.studentId}`,
			`lab:session:${id}`,
		);

		logger.debug({ id }, "Session removed");
	});
});

// Node events
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

// Health & interface events
emitter.on("node-health", async (node, isTemp) => {
	if (isTemp) tempNodeEvents.emit(`${node.id}:health`, node.health);

	await sessionThrottle.wait(node.labSessionId, {
		id: "health",
		execute: async () => {
			await db
				.update(labSessionNodes)
				.set({ health: node.health })
				.where(eq(labSessionNodes.id, node.id));

			await cache.delete(`lab:session:${node.labSessionId}`);

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

		await cache.delete(`lab:session:${node.labSessionId}`);

		logger.debug({ nodeId: node.id }, "Node interfaces updated");
	});
});

export const initClabSync = init;
