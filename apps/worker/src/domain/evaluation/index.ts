import evaluator from "@vlab/evaluator";
import type { NodeInfo } from "@vlab/evaluator/types";
import docker from "@worker/lib/docker";
import baseLogger from "@worker/lib/logger";
import { monitor } from "@worker/lib/monitor";

const logger = baseLogger.child({ service: "evaluator" });

const activeEvaluations = new Map<
	string,
	ReturnType<typeof evaluator.createSession>
>();
const stoppingEvaluations = new Set<string>();
const stopTimers = new Map<string, ReturnType<typeof setTimeout>>();

evaluator.setSourceRead(
	"node-interface.interfaces-ip",
	({ node }) => monitor.interfaceMap.get(node.id) ?? {},
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
		const pendingStop = stopTimers.get(sessionId);
		if (pendingStop) {
			clearTimeout(pendingStop);
			stopTimers.delete(sessionId);
		}
		session.check();
		return session;
	}

	logger.info({ sessionId }, "Starting lab evaluation");

	const evalSession = evaluator.createSession(
		docker,
		nodeMap,
		sessionChecks,
		{
			isNodeHealthy: monitor.health.isHealthy,
			waitForHealth: (nodeId, timeoutMs, signal) =>
				monitor.health.wait(nodeId, { timeout: timeoutMs, signal }),
		},
		values,
	);

	evalSession.onSourceError((sourceKey, error) => {
		logger.warn(
			{ sessionId, sourceKey, err: error },
			"Lab evaluation source failed",
		);
	});

	evalSession.onChange(async (id, value) => {
		if (
			stoppingEvaluations.has(sessionId) ||
			activeEvaluations.get(sessionId) !== evalSession
		) {
			return;
		}

		logger.debug({ sessionId, checkId: id, value }, "Lab node check changed");

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

	const pendingStop = stopTimers.get(sessionId);
	if (pendingStop) {
		clearTimeout(pendingStop);
		stopTimers.delete(sessionId);
	}

	if (options.immediate) {
		logger.debug({ sessionId }, "Stopping lab evaluation immediately");
		return stopEvaluationSession(sessionId);
	}

	logger.debug({ sessionId }, "Scheduling lab evaluation stop");

	return new Promise((resolve) => {
		const timer = setTimeout(() => {
			stopTimers.delete(sessionId);
			stopEvaluationSession(sessionId).then(resolve);
		}, 30000);
		stopTimers.set(sessionId, timer);
	});
}

export function stopAllEvaluationsImmediately() {
	return Promise.all(
		[...activeEvaluations.keys()].map((sessionId) =>
			stopLabEvaluation(sessionId, { immediate: true }),
		),
	);
}
