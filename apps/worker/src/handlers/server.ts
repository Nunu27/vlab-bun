import {
	type AsyncQueue,
	appRouter,
	msgpackCodec,
	type WorkerProto,
} from "@vlab/grpc";
import baseLogger from "@worker/lib/logger";
import type { WaycastServerTransport } from "waycast";

export type RpcServer = ReturnType<typeof appRouter.buildServer>;

const MANAGER_CONNECTION_ID = "manager";

export function createRpcServer(
	replyQueue: AsyncQueue<WorkerProto.CommandPayload>,
) {
	const logger = baseLogger.child({ service: "rpc" });

	let deliver: ((connectionId: string, raw: string) => void) | undefined;

	const transport: WaycastServerTransport<Record<string, never>> = {
		start({ onConnection, onMessage }) {
			deliver = onMessage;
			onConnection(MANAGER_CONNECTION_ID, {});
		},
		send(_connectionId, raw) {
			replyQueue.push({ payload: Buffer.from(raw, "base64") });
		},
		disconnect() {},
		stop() {},
	};

	const server = appRouter.buildServer({
		logger,
		transport,
		codec: msgpackCodec,
	});

	function feedMessage(raw: string) {
		deliver?.(MANAGER_CONNECTION_ID, raw);
	}

	return { server, feedMessage };
}
