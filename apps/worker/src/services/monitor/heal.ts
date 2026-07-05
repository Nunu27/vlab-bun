import type { NodeInfo } from "@vlab/clab-monitor";
import {
	HEAL_COOLDOWN_MS,
	HEAL_MAX_ATTEMPTS,
	HEAL_RETRY_BASE_MS,
	HEAL_RETRY_FACTOR,
} from "@worker/constants";
import clab from "@worker/lib/clab";
import baseLogger from "@worker/lib/logger";
import { expBackoff } from "@worker/utils/backoff";

const logger = baseLogger.child({ service: "heal" });

type HealState = {
	attempts: number;
	lastAttemptAt: number;
	healing: boolean;
	retryTimer?: ReturnType<typeof setTimeout>;
};

const states = new Map<string, HealState>();

function getState(id: string): HealState {
	let state = states.get(id);
	if (!state) {
		state = { attempts: 0, lastAttemptAt: 0, healing: false };
		states.set(id, state);
	}
	return state;
}

export function reset(id: string) {
	const state = states.get(id);
	if (state?.retryTimer) clearTimeout(state.retryTimer);
	states.delete(id);
}

export function trigger(node: NodeInfo) {
	const state = getState(node.id);
	if (state.healing || state.retryTimer) return;
	if (
		state.attempts > 0 &&
		Date.now() - state.lastAttemptAt < HEAL_COOLDOWN_MS
	) {
		return;
	}
	if (state.attempts >= HEAL_MAX_ATTEMPTS) {
		logger.error(
			{ id: node.id, sessionId: node.lab, nodeName: node.name },
			"Auto-heal already exhausted retries for this node, not retrying again",
		);
		return;
	}

	void attempt(node, state);
}

async function attempt(node: NodeInfo, state: HealState) {
	state.healing = true;
	state.attempts++;
	state.lastAttemptAt = Date.now();

	logger.warn(
		{
			id: node.id,
			sessionId: node.lab,
			name: node.name,
			attempt: state.attempts,
		},
		"Node unhealthy, attempting auto-heal restart",
	);

	try {
		const inspected = await clab.redeployNode(node.lab, node.name);
		const restarted = inspected.find((n) => n.name === node.name);
		const ip = restarted?.ipv4Address?.split("/")[0];
		const newId = restarted?.containerId;

		if (!ip || !newId) {
			throw new Error(
				"Auto-heal restart completed but node info is incomplete",
			);
		}

		logger.info(
			{ id: node.id, sessionId: node.lab },
			"Auto-heal restart completed",
		);
		state.healing = false;
	} catch (error) {
		state.healing = false;
		logger.error(
			{
				err: error,
				id: node.id,
				sessionId: node.lab,
				attempt: state.attempts,
			},
			"Auto-heal restart failed",
		);

		if (state.attempts >= HEAL_MAX_ATTEMPTS) {
			logger.error(
				{ id: node.id, sessionId: node.lab, nodeName: node.name },
				"Auto-heal exhausted retries, giving up",
			);
			return;
		}

		const delay = expBackoff(state.attempts - 1, {
			base: HEAL_RETRY_BASE_MS,
			factor: HEAL_RETRY_FACTOR,
			cap: 60_000,
		});
		state.retryTimer = setTimeout(() => {
			state.retryTimer = undefined;
			trigger(node);
		}, delay);
	}
}

export function clearAll() {
	for (const [id, state] of states) {
		if (state.retryTimer) clearTimeout(state.retryTimer);
		states.delete(id);
	}
}
