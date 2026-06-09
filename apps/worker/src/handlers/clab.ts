import { deployLab, destroyLab } from "../lib/clab";
import type { RpcServer } from "./server";

export function registerClabHandlers(server: RpcServer) {
	server.on("clab:deployLab", async (ctx) => {
		const { sessionId, config } = ctx.payload;
		await deployLab(sessionId, config);
		return true;
	});

	server.on("clab:destroyLab", async (ctx) => {
		const { sessionId } = ctx.payload;
		await destroyLab(sessionId);
		return true;
	});
}
