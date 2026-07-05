import {
	startLabEvaluation,
	stopLabEvaluation,
} from "@worker/domain/evaluation";
import type { RpcServer } from "../transport";

export function registerEvaluatorHandlers(server: RpcServer) {
	server.on(
		"evaluator:start",
		async ({ payload: { sessionId, nodeMap, values, sessionChecks } }) => {
			await startLabEvaluation(
				sessionId,
				nodeMap,
				sessionChecks as Parameters<typeof startLabEvaluation>[2],
				values,
				(id, completed) => {
					server.emit("evaluator:checkChanged", {
						data: { sessionId, id, completed },
					});
				},
			);
		},
	);

	server.on("evaluator:stop", async ({ payload: { sessionId, immediate } }) => {
		await stopLabEvaluation(sessionId, { immediate: immediate || false });
	});
}
