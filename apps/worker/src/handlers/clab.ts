import { deployLab, destroyLab } from "../lib/clab";
import type { RpcServer } from "./server";

export function registerClabHandlers(server: RpcServer) {
	server.on(
		"clab:deployLab",
		async ({ payload: { sessionId, config }, reply }) => {
			const deployedNodes = await deployLab(sessionId, config);
			reply("deployed", deployedNodes);
		},
	);

	server.on("clab:destroyLab", async ({ payload: { sessionId } }) => {
		await destroyLab(sessionId);
	});
}
