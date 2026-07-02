import db from "@manager/db";
import {
	deviceTemplates,
	labSessionNodes,
	labSessions,
	workers,
} from "@manager/db/schema";
import baseLogger from "@manager/lib/logger";
import { sendCommandToWorker } from "@manager/services/grpc";
import guacamole from "@manager/services/guacamole-lite";
import { cache } from "@manager/services/http/middlewares/caching";
import { labSessionQueue } from "@manager/services/queue/lab-session";
import ws from "@manager/services/ws";
import type { LabLink, LabNode } from "@manager/types/clab";
import { getAffectedCount } from "@manager/utils/db";
import { eq, inArray, sql } from "drizzle-orm";

const logger = baseLogger.child({ service: "lab-session" });

async function rollbackSession(sessionId: string, workerId: string) {
	const shouldDecrement = await getAffectedCount(
		db.delete(labSessions).where(eq(labSessions.id, sessionId)),
	);

	if (shouldDecrement) {
		await db
			.update(workers)
			.set({ activeLabs: sql`GREATEST(${workers.activeLabs} - 1, 0)` })
			.where(eq(workers.id, workerId));
	}
}

export async function initSession(
	workerId: string,
	payload: {
		requestId: string;
		sessionId: string;
		labId: string;
		userId: string;
		nodes: LabNode[];
		links: LabLink[];
		dueDate: number;
	},
) {
	const { requestId, sessionId, labId, userId, nodes, links, dueDate } =
		payload;

	try {
		const now = new Date();
		const dueDateObj = new Date(dueDate);

		await db
			.insert(labSessions)
			.values({
				id: sessionId,
				labId,
				studentId: userId,
				workerId,
				dueDate: dueDateObj,
				createdAt: now,
				updatedAt: now,
			})
			.onConflictDoNothing();

		await cache.delete(`lab:${labId}:lab-session:list:${userId}`);
		ws.server.emit("lab:[labId]:enrollment:update", {
			params: { labId },
			data: {
				id: userId,
				status: "In Progress",
				lastUpdated: now,
			},
		});

		const deployedNodes = await sendCommandToWorker(
			workerId,
			"clab:deployLab",
			{
				sessionId,
				config: {
					labId,
					ownerId: userId,
					nodes,
					links,
					dueDate,
				},
			},
		);

		const deployedNodeIds = new Set(deployedNodes.map((n) => n.id));
		const missing = nodes.filter((n) => !deployedNodeIds.has(n.id));

		if (missing.length) {
			logger.error(
				{
					sessionId,
					missing: missing.map((n) => n.id),
					expected: nodes.length,
					deployed: deployedNodes.length,
				},
				"Partial lab deployment detected, tearing down",
			);

			await sendCommandToWorker(workerId, "clab:destroyLab", {
				sessionId,
			}).catch((err) =>
				logger.error(
					{ err, sessionId },
					"Failed to clean up partially deployed session",
				),
			);
			await rollbackSession(sessionId, workerId);

			ws.server.replyError(
				"lab:[id]:init",
				requestId,
				"Some devices failed to start. Please try again.",
			);
			return;
		}

		const nodesById = new Map(nodes.map((n) => [n.id, n]));
		const deviceIds = [
			...new Set(
				nodes.map((n) => n.deviceId).filter((id): id is string => !!id),
			),
		];

		const [templates, worker] = await Promise.all([
			deviceIds.length
				? db.query.deviceTemplates.findMany({
						where: inArray(deviceTemplates.id, deviceIds),
						columns: { id: true, connection: true, kind: true },
					})
				: Promise.resolve([]),
			db.query.workers.findFirst({
				where: eq(workers.id, workerId),
				columns: { guacdHost: true, guacdPort: true },
			}),
		]);
		const templatesMap = new Map(templates.map((t) => [t.id, t]));

		if (!worker) throw new Error(`Worker ${workerId} not found`);

		const rows = deployedNodes.flatMap((deployedNode) => {
			const node = nodesById.get(deployedNode.id);
			if (!node?.labNodeId || !node.deviceId) return [];

			const template = templatesMap.get(node.deviceId);
			if (!template) {
				logger.error(
					{ sessionId, nodeId: deployedNode.id, deviceId: node.deviceId },
					"Device template not found for deployed node, skipping",
				);
				return [];
			}

			const healthValue =
				deployedNode.health != null &&
				["healthy", "unhealthy", "starting"].includes(deployedNode.health)
					? deployedNode.health
					: null;

			return [
				{
					id: deployedNode.id,
					name: node.name,
					ip: deployedNode.ip,
					health: healthValue as "healthy" | "unhealthy" | "starting" | null,
					interfaces: {},
					containerId: deployedNode.containerId,
					token: guacamole.generateNodeToken(
						template.connection,
						template.kind,
						deployedNode.ip,
						worker.guacdHost,
						worker.guacdPort,
					),
					labSessionId: sessionId,
					labNodeId: node.labNodeId,
					deviceTemplateId: node.deviceId,
				},
			];
		});

		if (rows.length) {
			await db.insert(labSessionNodes).values(rows).onConflictDoNothing();
			await db
				.update(workers)
				.set({ activeNodes: sql`${workers.activeNodes} + ${rows.length}` })
				.where(eq(workers.id, workerId));
		}

		ws.server.reply("lab:[id]:init", requestId)(
			"info",
			"Lab provisioned successfully.",
		);
		ws.server.replyResponse("lab:[id]:init", requestId, sessionId);

		await labSessionQueue.add(
			"cleanup",
			{ sessionId, workerId },
			{
				delay: Math.max(0, dueDateObj.getTime() - Date.now()),
				jobId: sessionId,
			},
		);
	} catch (error) {
		logger.error({ err: error, sessionId }, "Failed to initialize lab session");
		await rollbackSession(sessionId, workerId).catch((err) =>
			logger.error({ err, sessionId }, "Failed to roll back lab session"),
		);

		ws.server.replyError(
			"lab:[id]:init",
			requestId,
			error instanceof Error ? error.message : String(error),
		);
	}
}
