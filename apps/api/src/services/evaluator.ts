import db from "@api/db";
import { labSessionChecks } from "@api/db/schema";
import docker from "@api/services/docker";
import baseLogger from "@api/services/logger";
import ws from "@api/services/ws";
import Debouncer from "@api/utils/debouncer";
import evaluator from "@vlab/evaluator";
import type { NodeInfo } from "@vlab/evaluator/types";
import { clabMonitor } from "./events";

const logger = baseLogger.child({ service: "evaluator" });

const debouncer = new Debouncer(30000);
const activeEvaluations = new Map<
	string,
	ReturnType<typeof evaluator.createSession>
>();
const stoppingEvaluations = new Set<string>();

evaluator.setSourceRead(
	"node-interface.interfaces-ip",
	({ node }) => clabMonitor.nodeInterfaceMap.get(node.id) || {},
);

export async function startLabEvaluation(sessionId: string, labId: string) {
	const session = activeEvaluations.get(sessionId);
	if (session) {
		logger.debug(
			{ sessionId },
			"Cancelling evaluation stop, session reconnected",
		);
		debouncer.cancel(sessionId);
		stoppingEvaluations.delete(sessionId);
		session.check();
		return session;
	}

	logger.info({ sessionId, labId }, "Starting lab evaluation");

	const lab = await db.query.labs.findFirst({
		columns: { checks: true },
		where: (lab, { eq }) => eq(lab.id, labId),
	});

	if (!lab) throw new Error("Lab not found");

	const nodes = await db.query.labSessionNodes.findMany({
		columns: { id: true, ip: true, containerId: true, labNodeId: true },
		where: (node, { eq }) => eq(node.labSessionId, sessionId),
	});

	const checks = await db.query.labSessionChecks.findMany({
		columns: { checkId: true, completed: true },
		where: (check, { eq }) => eq(check.labSessionId, sessionId),
	});

	const values = checks.reduce<Record<string, boolean>>((acc, check) => {
		acc[check.checkId] = check.completed;
		return acc;
	}, {});

	const nodeMap: Record<string, NodeInfo> = {};
	const nodeIdMap: Record<string, string> = {};

	nodes.forEach((n) => {
		nodeIdMap[n.labNodeId] = n.id;
		nodeMap[n.id] = n;
	});

	// biome-ignore lint/suspicious/noExplicitAny: loose typing for db results
	const sessionChecks: any = Object.entries(lab.checks).map(
		([id, { checkId, nodeId, params }]) => ({
			id,
			checkId: checkId as `${string}.${string}`,
			nodeId: nodeIdMap[nodeId],
			params: params as Record<string, never>,
		}),
	);

	const evalSession = evaluator.createSession(
		docker,
		nodeMap,
		sessionChecks,
		{
			isNodeHealthy: clabMonitor.isNodeHealthy,
			waitForHealth: clabMonitor.waitForHealth,
		},
		values,
	);

	evalSession.onChange(async (id, value) => {
		if (
			stoppingEvaluations.has(sessionId) ||
			activeEvaluations.get(sessionId) !== evalSession
		) {
			return;
		}

		logger.debug({ sessionId, checkId: id, value }, "Lab node check changed");

		await db
			.insert(labSessionChecks)
			.values({
				labSessionId: sessionId,
				checkId: id,
				completed: value,
			})
			.onConflictDoUpdate({
				target: [labSessionChecks.labSessionId, labSessionChecks.checkId],
				set: {
					completed: value,
				},
			});

		ws.server.emit("lab-session:[sessionId]:checks", {
			params: { sessionId },
			data: { id, completed: value },
		});
	});

	activeEvaluations.set(sessionId, evalSession);

	try {
		await evalSession.start();
		await evalSession.check();
	} catch (error) {
		activeEvaluations.delete(sessionId);
		stoppingEvaluations.delete(sessionId);
		await evalSession.stop();
		throw error;
	}

	return evalSession;
}

async function stopEvaluationSession(sessionId: string) {
	const session = activeEvaluations.get(sessionId);
	if (!session) return;

	try {
		await session.stop();
	} catch (error) {
		logger.warn({ error, sessionId }, "Failed to stop lab evaluation cleanly");
	} finally {
		activeEvaluations.delete(sessionId);
		stoppingEvaluations.delete(sessionId);
	}

	logger.info({ sessionId }, "Stopped lab evaluation");
}

export function stopLabEvaluation(
	sessionId: string,
	options: { immediate?: boolean } = {},
) {
	if (!activeEvaluations.has(sessionId)) return Promise.resolve();
	stoppingEvaluations.add(sessionId);

	if (options.immediate) {
		debouncer.cancel(sessionId);
		logger.debug({ sessionId }, "Stopping lab evaluation immediately");
		return stopEvaluationSession(sessionId);
	}

	logger.debug({ sessionId }, "Scheduling lab evaluation stop");

	return debouncer
		.run(sessionId, () => {
			return stopEvaluationSession(sessionId);
		})
		.catch(() => {
			logger.debug({ sessionId }, "Lab evaluation stop cancelled");
		});
}
