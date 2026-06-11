import { encode } from "@msgpack/msgpack";
import { type AsyncQueue, appRouter, type WorkerProto } from "@vlab/grpc";
import pino from "pino";

export type RpcServer = ReturnType<typeof appRouter.buildServer>;

export function createRpcServer(
	replyQueue: AsyncQueue<WorkerProto.CommandPayload>,
) {
	const logger = pino({ name: "waycast" });
	const server = appRouter.buildServer({
		logger,
		emit: () => {
			// No-op since the server only needs to reply, not emit events
		},
		reply: (_topic, message) => {
			replyQueue.push({ payload: Buffer.from(encode(message)) });
		},
	});

	return server;
}
