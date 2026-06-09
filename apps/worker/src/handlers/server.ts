import { encode } from "@msgpack/msgpack";
import { type AsyncQueue, appRouter, type WorkerProto } from "@vlab/grpc";

export type RpcServer = ReturnType<typeof appRouter.buildServer>;

export function createRpcServer(
	replyQueue: AsyncQueue<WorkerProto.CommandPayload>,
) {
	const server = appRouter.buildServer({
		emit: () => {
			// No-op since the server only needs to reply, not emit events
		},
		reply: (_topic, message) => {
			replyQueue.push({ payload: Buffer.from(encode(message)) });
		},
	});

	return server;
}
