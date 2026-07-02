import evaluator from "@vlab/evaluator";
import type { NodeInfo } from "@vlab/evaluator/types";
import baseLogger from "@worker/lib/logger";
import { clabMonitor } from "./clab-monitor";
import docker from "./docker";

const logger = baseLogger.child({ service: "evaluator" });

const activeEvaluations = new Map<
	string,
	ReturnType<typeof evaluator.createSession>
>();
const stoppingEvaluations = new Set<string>();

evaluator.setSourceRead(
	"node-interface.interfaces-ip",
	({ node }) => clabMonitor.nodeInterfaceMap.get(node.id) || {},
);

export async function startLabEvaluation(
	sessionId: string,
	nodeMap: Record<string, NodeInfo>,
	sessionChecks: Parameters<typeof evaluator.createSession>[2],
	values: Record<string, boolean>,
	onCheckChange: (id: string, value: boolean) => void,
) {
	const session = activeEvaluations.get(sessionId);
	if (session) {
		logger.debug(
			{ sessionId },
			"Cancelling evaluation stop, session reconnected",
		);
		stoppingEvaluations.delete(sessionId);
		session.check();
		return session;
	}

	logger.info({ sessionId }, "Starting lab evaluation");

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

		// Fire callback instead of updating DB directly
		onCheckChange(id, value);
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

export async function stopEvaluationSession(sessionId: string) {
	const session = activeEvaluations.get(sessionId);
	if (!session) return;

	try {
		await session.stop();
	} catch (error) {
		logger.warn(
			{ err: error, sessionId },
			"Failed to stop lab evaluation cleanly",
		);
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
		logger.debug({ sessionId }, "Stopping lab evaluation immediately");
		return stopEvaluationSession(sessionId);
	}

	logger.debug({ sessionId }, "Scheduling lab evaluation stop");

	// A simple timeout for "debouncing" stop
	return new Promise((resolve) => {
		setTimeout(() => {
			stopEvaluationSession(sessionId).then(resolve);
		}, 30000);
	});
}
