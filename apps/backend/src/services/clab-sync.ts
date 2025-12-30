import db from "@backend/db";
import { labNodes, labSessions } from "@backend/db/schema";
import env from "@backend/env";
import { deleteCache } from "@backend/middlewares/caching";
import deviceRouter from "@backend/routes/device";
import labRouter from "@backend/routes/lab";
import Debouncer from "@backend/utils/debouncer";
import Throttler from "@backend/utils/throttler";
import { createMonitor } from "@vlab/monitor";
import { eq, notInArray, sql } from "drizzle-orm";
import docker from "./docker";
import { childLogger } from "./logger";

let initialized = false;
const logger = childLogger("clab-sync");

const sessionThrottle = new Throttler(1000);
const interfaceDebounce = new Debouncer(750);

export function startSync() {
	if (initialized) return;
	initialized = true;

	const clabMonitor = createMonitor({
		host: env.CLAB_HOST,
		logger: childLogger("monitor"),
		docker
	});

	clabMonitor.on("snapshot", async ({ sessions, nodes }) => {
		const sessionIds: string[] = [];
		let haveTestSession = false;
		let haveUserSession = false;

		for (const session of sessions) {
			sessionIds.push(session.id);

			if (session.type === "device-test") haveTestSession = true;
			if (session.type === "user") haveUserSession = true;
		}

		if (sessions.length) {
			await db
				.delete(labSessions)
				.where(notInArray(labSessions.id, sessionIds));
			await db.insert(labSessions).values(sessions).onConflictDoNothing();
		} else {
			await db.delete(labSessions);
		}

		if (nodes.length) {
			await db
				.insert(labNodes)
				.values(nodes)
				.onConflictDoUpdate({
					target: labNodes.id,
					set: {
						health: sql`excluded.health`,
						interfaces: sql`excluded.interfaces`
					}
				});
		}

		if (!haveUserSession) {
			labRouter.store.cron["lab-session-cleanup"].pause();
		}
		if (!haveTestSession) {
			deviceRouter.store.cron["device-test-session-cleanup"].resume();
		}

		logger.info(
			{ sessions: sessions.length, nodes: nodes.length },
			"Synchronized containerlab state to database"
		);
	});

	clabMonitor.on("session-create", (session) => {
		sessionThrottle.run(session.id, async () => {
			await db.insert(labSessions).values(session).onConflictDoNothing();
			await deleteCache("lab:pagination:*");
			logger.debug({ id: session.id }, "Session created");
		});
	});

	clabMonitor.on("session-remove", (id) => {
		sessionThrottle.run(id, async () => {
			await db.delete(labSessions).where(eq(labSessions.id, id));
			await deleteCache("lab:pagination:*", `lab:session:${id}`);
			logger.debug({ id }, "Session removed");
		});
	});

	clabMonitor.on("node-create", async (node) => {
		await sessionThrottle.wait(node.labSessionId);

		await db.insert(labNodes).values(node).onConflictDoNothing();
		logger.debug({ id: node.id }, "Node created");
	});

	clabMonitor.on("node-health", async (node) => {
		await sessionThrottle.wait(node.labSessionId, {
			id: "health",
			execute: async () => {
				await db
					.update(labNodes)
					.set({ health: node.health })
					.where(eq(labNodes.id, node.id));
				await deleteCache(`lab:session:${node.labSessionId}`);

				logger.debug(
					{ id: node.id, health: node.health },
					"Node health updated"
				);
			}
		});
	});

	clabMonitor.on("interface-update", (node) => {
		interfaceDebounce.run(node.id, async () => {
			await db
				.update(labNodes)
				.set({ interfaces: node.interfaces })
				.where(eq(labNodes.id, node.id));
			await deleteCache(`lab:session:${node.labSessionId}`);

			logger.debug({ id: node.id }, "Node interfaces updated");
		});
	});
}
