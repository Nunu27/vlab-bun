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

evaluator.setSourceRead("node-interface.interfaces-ip", ({ node }) => {
	console.log("Reading node interfaces for node", {
		nodeId: node.id,
		interfaces: clabMonitor.nodeInterfaceMap.get(node.id),
	});
	return clabMonitor.nodeInterfaceMap.get(node.id) || {};
});

export async function startLabEvaluation(sessionId: string, labId: string) {
	const session = activeEvaluations.get(sessionId);
	if (session) {
		logger.debug(
			{ sessionId },
			"Cancelling evaluation stop, session reconnected",
		);
		debouncer.cancel(sessionId);
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

	const evalSession = evaluator.createSession(docker, nodeMap, sessionChecks);

	evalSession.onChange(async (id, value) => {
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

	await evalSession.start();
	evalSession.check();
	activeEvaluations.set(sessionId, evalSession);

	return evalSession;
}

export function stopLabEvaluation(sessionId: string) {
	if (!activeEvaluations.has(sessionId)) return;

	logger.debug({ sessionId }, "Scheduling lab evaluation stop");

	debouncer
		.run(sessionId, () => {
			const session = activeEvaluations.get(sessionId);
			if (!session) return;

			session.stop();
			activeEvaluations.delete(sessionId);

			logger.info({ sessionId }, "Stopped lab evaluation");
		})
		.catch(() => {
			logger.debug({ sessionId }, "Lab evaluation stop cancelled");
		});
}
