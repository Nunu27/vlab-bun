import redis from "@manager/lib/redis";
import {
	dispatchWorkerAction,
	waitForAvailableWorkerId,
} from "@manager/services/grpc";
import ws from "@manager/services/ws";

const PREFIX = "test-lab-worker:";

ws.server.on(
	"device-template:test",
	async ({ connectionId, requestId, payload, context }) => {
		const workerId = await waitForAvailableWorkerId();
		await redis.client.set(`${PREFIX}${requestId}`, workerId);

		await dispatchWorkerAction("device:testInit", workerId, {
			connectionId,
			requestId,
			userId: context.session.id,
			data: payload,
		});

		return ws.server.defer;
	},
);

ws.server.onDispose("device-template:test", async (_, requestId) => {
	const workerId = await redis.client.get(`${PREFIX}${requestId}`);
	if (!workerId) return;

	await dispatchWorkerAction("device:testCleanup", workerId, {
		sessionId: requestId,
	});
	await redis.client.del(`${PREFIX}${requestId}`);
});
