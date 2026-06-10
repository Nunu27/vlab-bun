import { workerActions } from "@manager/services/actions";
import { getAvailableWorkerId } from "@manager/services/grpc";
import ws from "@manager/services/ws";

const testLabWorkers = new Map<string, string>();

ws.server.onDispose("device-template:test", async (requestId) => {
	try {
		const workerId = testLabWorkers.get(requestId);
		if (workerId) {
			await workerActions.dispatch("device:testCleanup", workerId, {
				sessionId: requestId,
			});
			testLabWorkers.delete(requestId);
		}
	} catch (error) {
		console.error(`Failed to cleanup device-template lab ${requestId}:`, error);
	}
});

ws.server.on("device-template:test", async (ctx) => {
	const data = ctx.payload;
	const executionId = ctx.requestId;

	let workerId: string;
	try {
		workerId = await getAvailableWorkerId();
		testLabWorkers.set(executionId, workerId);
	} catch (_err) {
		throw new Error("No online workers available to run this test.");
	}

	await workerActions.dispatch("device:testInit", workerId, {
		connectionId: ctx.connectionId,
		requestId: ctx.requestId,
		userId: ctx.context.session.id,
		data,
	});
});
