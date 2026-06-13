import { deployLab, destroyLab } from "../lib/clab";
import type { RpcServer } from "./server";

export function registerClabHandlers(server: RpcServer) {
	server.on("clab:deployLab", async ({ payload: { sessionId, config } }) => {
		await deployLab(sessionId, config);
	});

	server.on("clab:destroyLab", async ({ payload: { sessionId } }) => {
		await destroyLab(sessionId);
	});
}
