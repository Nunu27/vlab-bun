import { startLabEvaluation, stopLabEvaluation } from "../lib/evaluator";
import type { RpcServer } from "./server";

export function registerEvaluatorHandlers(server: RpcServer) {
	server.on(
		"evaluator:start",
		async ({
			payload: { sessionId, nodeMap, values, sessionChecks },
			reply,
		}) => {
			await startLabEvaluation(
				sessionId,
				nodeMap,
				sessionChecks as Parameters<typeof startLabEvaluation>[2],
				values,
				(id, completed) => {
					reply("checkChanged", { id, completed });
				},
			);
		},
	);

	server.on("evaluator:stop", async ({ payload: { sessionId, immediate } }) => {
		await stopLabEvaluation(sessionId, { immediate: immediate || false });
	});
}
