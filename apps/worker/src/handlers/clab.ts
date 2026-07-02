import { deployLab, destroyLab, reconcileSessions } from "../lib/clab";
import type { RpcServer } from "./server";

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
