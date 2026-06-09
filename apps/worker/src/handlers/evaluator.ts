import type { NodeInfo } from "@vlab/evaluator/types";
import { startLabEvaluation, stopLabEvaluation } from "../lib/evaluator";
import type { RpcServer } from "./server";

export function registerEvaluatorHandlers(server: RpcServer) {
	server.on("evaluator:start", async (ctx) => {
		const { sessionId, values } = ctx.payload;
		const nodeMap = ctx.payload.nodeMap as Record<string, NodeInfo>;
		const sessionChecks = ctx.payload.sessionChecks as unknown[];
		await startLabEvaluation(
			sessionId,
			nodeMap,
			sessionChecks,
			values,
			(id, completed) => {
				ctx.reply("checkChanged", { id, completed });
			},
		);
		return true;
	});

	server.on("evaluator:stop", async (ctx) => {
		const { sessionId, immediate } = ctx.payload;
		await stopLabEvaluation(sessionId, { immediate: immediate || false });
		return true;
	});
}
