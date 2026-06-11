import { deployLab, destroyLab } from "../lib/clab";
import type { RpcServer } from "./server";

export function registerClabHandlers(server: RpcServer) {
	server.on("clab:deployLab", async (ctx) => {
		try {
			const { sessionId, config } = ctx.payload;
			await deployLab(sessionId, config);
			return true;
		} catch (error) {
			console.error(
				`Failed to deploy lab for session ${ctx.payload.sessionId}:`,
				error,
			);
			throw new Error(
				`Deploy failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	});

	server.on("clab:destroyLab", async (ctx) => {
		try {
			const { sessionId } = ctx.payload;
			await destroyLab(sessionId);
			return true;
		} catch (error) {
			console.error(
				`Failed to destroy lab for session ${ctx.payload.sessionId}:`,
				error,
			);
			throw new Error(
				`Destroy failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	});
}
