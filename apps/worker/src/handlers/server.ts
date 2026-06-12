import { encode } from "@msgpack/msgpack";
import { type AsyncQueue, appRouter, type WorkerProto } from "@vlab/grpc";
import baseLogger from "@worker/lib/logger";

export type RpcServer = ReturnType<typeof appRouter.buildServer>;

export function createRpcServer(
	replyQueue: AsyncQueue<WorkerProto.CommandPayload>,
) {
	const logger = baseLogger.child({ service: "rpc" });
	const server = appRouter.buildServer({
		logger,
		emit: (_topic, message) => {
			replyQueue.push({ payload: Buffer.from(encode(message)) });
		},
		reply: (_topic, message) => {
			replyQueue.push({ payload: Buffer.from(encode(message)) });
		},
	});

	return server;
}
