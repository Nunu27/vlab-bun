import logger from "@manager/lib/logger";
import redis from "@manager/lib/redis";
import { decode } from "@msgpack/msgpack";
import type { ActionName, ActionPayload } from "./actions";
import { handleForwardedAction, workerActionChannelPrefix } from "./dispatch";

export * from "./actions";
export * from "./dispatch";
export * from "./monitor";
export * from "./worker";
export * from "./worker-capacity";
export { resetStaleWorkers } from "./worker-reconcile";
export * from "./worker-registry";

type DecodedAction = {
	[K in ActionName]: { actionName: K; payload: ActionPayload<K> };
}[ActionName];

// Global listener for actions forwarded from other managers
redis.subscriber.on("messageBuffer", (channelBuffer, messageBuffer) => {
	const channel = channelBuffer.toString();
	if (!channel.startsWith(workerActionChannelPrefix)) return;

	const workerId = channel.slice(workerActionChannelPrefix.length);
	try {
		const decoded = decode(messageBuffer) as DecodedAction;
		handleForwardedAction(decoded.actionName, workerId, decoded.payload).catch(
			logger.error,
		);
	} catch (error) {
		logger.error(
			{ err: error },
			`Failed to execute forwarded action for ${workerId}:`,
		);
	}
});
