import { startLabEvaluation, stopLabEvaluation } from "../lib/evaluator";
import type { RpcServer } from "./server";

export function registerEvaluatorHandlers(server: RpcServer) {
	server.on("evaluator:start", async (ctx) => {
		const { sessionId, nodeMap, values } = ctx.payload;
		const sessionChecks = ctx.payload.sessionChecks as Parameters<
			typeof startLabEvaluation
		>[2];
		await startLabEvaluation(
			sessionId,
			nodeMap,
			sessionChecks,
			values,
			(id, completed) => {
				ctx.reply("checkChanged", { id, completed });
			},
		);
	});

	server.on("evaluator:stop", async (ctx) => {
		const { sessionId, immediate } = ctx.payload;
		await stopLabEvaluation(sessionId, { immediate: immediate || false });
	});
}
