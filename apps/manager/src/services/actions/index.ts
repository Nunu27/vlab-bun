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

// Global listener for actions forwarded from other managers
redis.client.on("messageBuffer", (channelBuffer, messageBuffer) => {
	const channel = channelBuffer.toString();
	if (!channel.startsWith("vlab:worker-action:")) return;

	const workerId = channel.split(":")[2];
	try {
		const decoded = decode(messageBuffer) as {
			actionName: string;
			payload: unknown;
		};
		workerActions
			.handleForwarded(decoded.actionName, workerId, decoded.payload)
			.catch(console.error);
	} catch (error) {
		console.error(`Failed to execute forwarded action for ${workerId}:`, error);
	}
});
