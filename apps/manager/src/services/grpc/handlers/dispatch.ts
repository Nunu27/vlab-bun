import baseLogger from "@manager/lib/logger";
import redis from "@manager/lib/redis";
import { encode } from "@msgpack/msgpack";
import { type ActionName, type ActionPayload, actionHandlers } from "./actions";
import { connectedWorkers } from "./worker-registry";

const logger = baseLogger.child({ name: "worker-action" });

export const workerActionChannelPrefix = "vlab:worker-action:";

async function runLocally<K extends ActionName>(
	actionName: K,
	workerId: string,
	payload: ActionPayload<K>,
) {
	const handler = actionHandlers[actionName] as (
		workerId: string,
		payload: ActionPayload<K>,
	) => Promise<void>;
	await handler(workerId, payload);
}

export async function dispatchWorkerAction<K extends ActionName>(
	actionName: K,
	workerId: string,
	payload: ActionPayload<K>,
): Promise<boolean> {
	if (connectedWorkers.has(workerId)) {
		logger.debug(
			{ actionName, workerId, payload },
			`Executing action ${actionName} locally for worker ${workerId}`,
		);
		runLocally(actionName, workerId, payload).catch((err) => {
			logger.error(
				{ err },
				`Worker action ${actionName} failed for ${workerId}:`,
			);
		});
		return true;
	}

	logger.debug(
		{ actionName, workerId, payload },
		`Forwarding action ${actionName} via Redis to worker ${workerId}`,
	);
	const subscribers = await redis.client.publish(
		`${workerActionChannelPrefix}${workerId}`,
		Buffer.from(encode({ actionName, payload })),
	);
	return subscribers > 0;
}

export async function handleForwardedAction<K extends ActionName>(
	actionName: K,
	workerId: string,
	payload: ActionPayload<K>,
) {
	if (!connectedWorkers.has(workerId)) return;

	logger.debug(
		{ actionName, workerId, payload },
		`Executing forwarded action ${actionName} for worker ${workerId}`,
	);
	await runLocally(actionName, workerId, payload);
}
