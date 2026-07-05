import { deployLab } from "@worker/domain/lab/deploy";
import { destroyLab } from "@worker/domain/lab/destroy";
import { reconcileSessions } from "@worker/domain/lab/reconcile";
import type { RpcServer } from "../transport";

export function registerClabHandlers(server: RpcServer) {
	server.on("clab:deployLab", async ({ payload: { sessionId, config } }) => {
		return await deployLab(sessionId, config);
	});

	server.on("clab:destroyLab", async ({ payload: { sessionId } }) => {
		await destroyLab(sessionId);
	});

	server.on(
		"clab:reconcileSessions",
		async ({ payload: { activeSessionIds } }) => {
			return await reconcileSessions(activeSessionIds);
		},
	);
}
