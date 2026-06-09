import type { AsyncQueue, WorkerProto } from "@vlab/grpc";
import { registerClabHandlers } from "./clab";
import { registerDockerHandlers } from "./docker";
import { registerEvaluatorHandlers } from "./evaluator";
import { createRpcServer } from "./server";

export function initRpc(replyQueue: AsyncQueue<WorkerProto.CommandPayload>) {
	const server = createRpcServer(replyQueue);

	registerClabHandlers(server);
	registerEvaluatorHandlers(server);
	registerDockerHandlers(server);

	return server;
}
