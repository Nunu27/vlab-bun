import { appRouter, msgpackCodec } from "@vlab/grpc";
import baseLogger from "@worker/lib/logger";
import type { WaycastServerTransport } from "waycast";

export type RpcServer = ReturnType<typeof appRouter.buildServer>;

const MANAGER_CONNECTION_ID = "manager";

let deliver: ((connectionId: string, raw: string) => void) | undefined;
// Swapped out on every gRPC reconnect (see connection.ts) so replies destined
// for a dead stream are dropped instead of leaking into the next one.
let currentSink: ((raw: string) => void) | undefined;

const transport: WaycastServerTransport<Record<string, never>> = {
	start({ onConnection, onMessage }) {
		deliver = onMessage;
		onConnection(MANAGER_CONNECTION_ID, {});
	},
	send(_connectionId, raw) {
		currentSink?.(raw);
	},
	disconnect() {},
	stop() {},
};

export function setReplySink(sink: ((raw: string) => void) | undefined) {
	currentSink = sink;
}

export function feedMessage(raw: string) {
	deliver?.(MANAGER_CONNECTION_ID, raw);
}

const logger = baseLogger.child({ service: "rpc" });

export const server: RpcServer = appRouter.buildServer({
	logger,
	transport,
	codec: msgpackCodec,
});
