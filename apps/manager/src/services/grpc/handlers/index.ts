import logger from "@manager/lib/logger";
import redis from "@manager/lib/redis";
import { decode } from "@msgpack/msgpack";
import type { ActionName, ActionPayload } from "./actions";
import { handleForwardedAction, workerActionChannelPrefix } from "./dispatch";
import {
	capacityChannel,
	handleCapacityMessage,
} from "./worker-capacity-events";

export * from "./actions";
export * from "./dispatch";
export * from "./monitor";
export * from "./worker";
export * from "./worker-capacity";
export * from "./worker-capacity-events";
export { resetStaleWorkers, staleCutoff } from "./worker-reconcile";
export * from "./worker-registry";

type DecodedAction = {
	[K in ActionName]: { actionName: K; payload: ActionPayload<K> };
}[ActionName];

// Global listener for actions forwarded from other managers
redis.subscriber.on("messageBuffer", (channelBuffer, messageBuffer) => {
	const channel = channelBuffer.toString();

	if (channel === capacityChannel) {
		try {
			handleCapacityMessage(messageBuffer);
		} catch (error) {
			logger.error(
				{ err: error },
				"Failed to handle freed worker capacity broadcast",
			);
		}
		return;
	}

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

// Unlike the per-worker action channels, this one is cluster-wide: a lab queued
// on this manager can be unblocked by a release that happened on any other.
redis.subscriber
	.subscribe(capacityChannel)
	.catch((err) =>
		logger.error(
			{ err },
			"Failed to subscribe to the worker capacity channel; queued labs will not be woken by other managers",
		),
	);
