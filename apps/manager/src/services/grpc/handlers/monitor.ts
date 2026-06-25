import assert from "node:assert";
import EventEmitter from "node:events";
import db from "@manager/db";
import { labSessionNodes, labSessions, workers } from "@manager/db/schema";
import baseLogger from "@manager/lib/logger";
import guacamole from "@manager/services/guacamole-lite";
import { cache } from "@manager/services/http/middlewares/caching";
import { labSessionQueue } from "@manager/services/queue/lab-session";
import ws from "@manager/services/ws";
import type { TempNodeEvents } from "@manager/types/clab";
import type { TypedEventEmitter } from "@manager/types/events";
import Debouncer from "@manager/utils/debouncer";
import Throttler from "@manager/utils/throttler";
import type { appRouter } from "@vlab/grpc";
import type { NodeHealth } from "@vlab/shared/enums";
import type { DeviceTemplateConnection } from "@vlab/shared/schemas/device-template";
import { eq, sql } from "drizzle-orm";

const logger = baseLogger.child({ service: "monitor-grpc" });

export const tempNodeEvents: TypedEventEmitter<TempNodeEvents> =
	new EventEmitter();

const sessionThrottle = new Throttler(1000);
const interfaceDebounce = new Debouncer(750);

// emitEnrollmentUpdate removed

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

		const scoreStr = Math.round(
			(completedWeight / totalWeight) * 100,
		).toString();

		await tx
			.update(labSessions)
			.set({
				score: scoreStr,
				submittedAt: now,
			})
			.where(eq(labSessions.id, id));
		await tx
			.delete(labSessionNodes)
			.where(eq(labSessionNodes.labSessionId, id));
		return { ...session, score: scoreStr };
	});
	if (!session) return;

	await cache.delete(
		`lab:${session.labId}:lab-session:${session.id}`,
		`lab:${session.labId}:lab-session:list:${session.studentId}`,
	);

	logger.debug({ id }, "Session removed and submitted");
	ws.server.emit("lab:[labId]:enrollment:update", {
		params: { labId: session.labId },
		data: {
			id: session.studentId,
			status: "Submitted",
			score: session.score ?? undefined,
			lastUpdated: now,
		},
	});
}

export function attachMonitorHandlers(
	workerId: string,
	client: ReturnType<typeof appRouter.buildClient>,
	guacdConfig: { guacdHost: string; guacdPort: number },
) {
	client.onData("monitor:snapshot", {
		callback: async (event) => {
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

			if (staleSessions.length) {
				await db
					.update(workers)
					.set({
						activeLabs: sql`GREATEST(${workers.activeLabs} - ${staleSessions.length}, 0)`,
					})
					.where(eq(workers.id, workerId));
			}

			for (const { id } of staleSessions) {
				await sessionThrottle.run(id, () => submitActiveSession(id));
			}

			if (sessions.length && nodes.length) {
				const templateIds = [
					...new Set(
						nodes.map((n) => {
							assert(n.deviceTemplateId, "Node has no device template ID");
							return n.deviceTemplateId;
						}),
					),
				];
				if (templateIds.length === 0) return;

				const templateMap = new Map<
					string,
					{
						connection: DeviceTemplateConnection;
						kind: string;
					}
				>();
				const templates = await db.query.deviceTemplates.findMany({
					where: (dt, { inArray }) => inArray(dt.id, templateIds),
					columns: { id: true, connection: true, kind: true },
				});
				for (const t of templates) {
					templateMap.set(t.id, { connection: t.connection, kind: t.kind });
				}

				const nodeValues = nodes.map((node) => {
					assert(node.labNodeId, "Snapshot node missing labNodeId");
					assert(
						node.deviceTemplateId,
						"Snapshot node missing deviceTemplateId",
					);

					const health =
						node.health === "none" ? null : (node.health as NodeHealth | null);

					const template = templateMap.get(node.deviceTemplateId);
					assert(
						template,
						`Template ${node.deviceTemplateId} not found in map`,
					);

					return {
						id: node.id,
						name: node.name,
						ip: node.ip,
						interfaces: node.interfaces,
						containerId: node.containerId,
						health,
						token: guacamole.generateNodeToken(
							template.connection,
							template.kind,
							node.ip,
							guacdConfig.guacdHost,
							guacdConfig.guacdPort,
						),
						labSessionId: node.labSessionId,
						labNodeId: node.labNodeId,
						deviceTemplateId: node.deviceTemplateId,
					};
				});

				await db
					.insert(labSessionNodes)
					.values(nodeValues)
					.onConflictDoUpdate({
						target: labSessionNodes.id,
						set: {
							health: sql`excluded.health`,
							interfaces: sql`excluded.interfaces`,
							containerId: sql`excluded.container_id`,
							token: sql`excluded.token`,
						},
					});

				await cache.delete(
					...sessionIds.map((id) => `lab:*:lab-session:${id}`),
				);
			}

			logger.info(
				{ sessions: sessions.length, nodes: nodes.length, workerId },
				"Synchronized containerlab state",
			);
		},
	});

	client.onData("monitor:session-create", {
		callback: async (event) => {
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
					ws.server.emit("lab:[labId]:enrollment:update", {
						params: { labId },
						data: {
							id: ownerId,
							status: "In Progress",
							lastUpdated: now,
						},
					});
				});
			}
		},
	});

	client.onData("monitor:session-remove", {
		callback: async ({ sessionId }) => {
			await db
				.update(workers)
				.set({ activeLabs: sql`GREATEST(${workers.activeLabs} - 1, 0)` })
				.where(eq(workers.id, workerId));

			await sessionThrottle.run(sessionId, () =>
				submitActiveSession(sessionId),
			);
			ws.server.emit("lab-session:[sessionId]:ended", {
				params: { sessionId },
				data: undefined,
			});
			labSessionQueue.remove(sessionId);
		},
	});

	client.onData("monitor:node-create", {
		callback: async (event) => {
			const {
				id,
				name,
				ip,
				interfaces,
				containerId,
				health: rawHealth,
				labSessionId,
				labNodeId,
				deviceTemplateId,
			} = event;
			const health =
				rawHealth === "none" ? null : (rawHealth as NodeHealth | null);

			if (labNodeId && deviceTemplateId) {
				await sessionThrottle.wait(labSessionId);

				const template = await db.query.deviceTemplates.findFirst({
					where: (dt, { eq }) => eq(dt.id, deviceTemplateId),
					columns: { connection: true, kind: true },
				});
				if (!template) {
					logger.error(
						{ id, deviceTemplateId },
						"Device template not found for node, skipping insert",
					);
					return;
				}

				const token = guacamole.generateNodeToken(
					template.connection,
					template.kind,
					ip,
					guacdConfig.guacdHost,
					guacdConfig.guacdPort,
				);

				await db.insert(labSessionNodes).values({
					id,
					name,
					ip,
					interfaces,
					containerId,
					health,
					token,
					labSessionId,
					labNodeId,
					deviceTemplateId,
				});
			} else {
				tempNodeEvents.emit(`${id}:health`, health);
				tempNodeEvents.emit(`${id}:ip`, ip);
				tempNodeEvents.emit(`${id}:containerId`, containerId);
			}
		},
	});

	client.onData("monitor:node-health", {
		callback: async (event) => {
			const { node, isTemp } = event;
			const health =
				node.health === "none" ? null : (node.health as NodeHealth | null);

			if (isTemp) tempNodeEvents.emit(`${node.id}:health`, health);
			else {
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

				ws.server.emit("node:[id]:health", {
					params: { id: node.id },
					data: health,
				});
			}
		},
	});

	client.onData("monitor:interface-update", {
		callback: async (event) => {
			const { node } = event;

			for (const [iface, ips] of Object.entries(node.interfaces)) {
				ws.server.emit("node:[id]:interfaces:[interface]", {
					params: { id: node.id, interface: iface },
					data: ips,
				});
			}

			interfaceDebounce.run(node.id, async () => {
				await db
					.update(labSessionNodes)
					.set({ interfaces: node.interfaces })
					.where(eq(labSessionNodes.id, node.id));

				await cache.delete(`lab:*:lab-session:${node.labSessionId}`);
			});
		},
	});

	client.onData("monitor:node-remove", {
		callback: async (event) => {
			const { id, isTemp } = event;
			if (!isTemp) return;

			tempNodeEvents.emit(`${id}:health`, "deleted");
		},
	});
}
