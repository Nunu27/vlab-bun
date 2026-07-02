import logger from "@manager/lib/logger";
import redis from "@manager/lib/redis";
import { decode } from "@msgpack/msgpack";
import {
	handleInitLabSession,
	handleStartLabEvaluation,
	handleStopLabEvaluation,
	handleSubmitLabSession,
	handleTestCleanup,
	handleTestInit,
} from "./handlers";
import { WorkerActionRouter } from "./router";

export const workerActions = new WorkerActionRouter()
	.on("lab:initSession", handleInitLabSession)
	.on("lab:submitSession", handleSubmitLabSession)
	.on("evaluator:start", handleStartLabEvaluation)
	.on("evaluator:stop", handleStopLabEvaluation)
	.on("device:testInit", handleTestInit)
	.on("device:testCleanup", handleTestCleanup);

type ActionPayloads =
	typeof workerActions extends WorkerActionRouter<infer T> ? T : never;

type DecodedAction = {
	[K in keyof ActionPayloads]: {
		actionName: K;
		payload: ActionPayloads[K];
	};
}[keyof ActionPayloads];

// Global listener for actions forwarded from other managers
redis.subscriber.on("messageBuffer", (channelBuffer, messageBuffer) => {
	const channel = channelBuffer.toString();
	if (!channel.startsWith("vlab:worker-action:")) return;

	const workerId = channel.split(":")[2];
	try {
		const decoded = decode(messageBuffer) as DecodedAction;
		workerActions
			.handleForwarded(decoded.actionName, workerId, decoded.payload)
			.catch(logger.error);
	} catch (error) {
		logger.error(
			{ err: error },
			`Failed to execute forwarded action for ${workerId}:`,
		);
	}
});
