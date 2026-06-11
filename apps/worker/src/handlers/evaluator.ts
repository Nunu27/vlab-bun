import type { NodeInfo } from "@vlab/evaluator/types";
import { startLabEvaluation, stopLabEvaluation } from "../lib/evaluator";
import type { RpcServer } from "./server";

export function registerEvaluatorHandlers(server: RpcServer) {
	server.on("evaluator:start", async (ctx) => {
		try {
			const { sessionId, values } = ctx.payload;
			const nodeMap = ctx.payload.nodeMap as Record<string, NodeInfo>;
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
			return true;
		} catch (error) {
			console.error(
				`Failed to start evaluation for session ${ctx.payload.sessionId}:`,
				error,
			);
			throw new Error(
				`Evaluation start failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	});

	server.on("evaluator:stop", async (ctx) => {
		try {
			const { sessionId, immediate } = ctx.payload;
			await stopLabEvaluation(sessionId, { immediate: immediate || false });
			return true;
		} catch (error) {
			console.error(
				`Failed to stop evaluation for session ${ctx.payload.sessionId}:`,
				error,
			);
			throw new Error(
				`Evaluation stop failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	});
}
