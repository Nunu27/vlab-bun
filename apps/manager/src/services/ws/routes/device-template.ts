import {
	getAvailableWorkerId,
	sendCommandToWorker,
	tempNodeEvents,
} from "@manager/services/grpc";
import guacamole from "@manager/services/guacamole-lite";
import ws from "@manager/services/ws";
import { waitForEvent } from "@manager/utils/events";
import { sleep } from "bun";

const testLabWorkers = new Map<string, string>();

ws.server.onDispose("device-template:test", async (requestId) => {
	try {
		const workerId = testLabWorkers.get(requestId);
		if (workerId) {
			sendCommandToWorker(workerId, "clab:destroyLab", {
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
	const nodeId = Bun.randomUUIDv7();

	let workerId: string;
	try {
		workerId = await getAvailableWorkerId();
		testLabWorkers.set(executionId, workerId);
	} catch (_err) {
		throw new Error("No online workers available to run this test.");
	}

	ctx.reply("info", `Pulling image ${data.image}...`);

	sendCommandToWorker(workerId, "docker:pullImage", { image: data.image });

	ctx.reply("info", "Image pulled successfully.");

	// Lab provisioning
	ctx.reply("info", "Provisioning device...");

	const ipPromise = waitForEvent(tempNodeEvents, `${nodeId}:ip`, {
		timeout: 120000,
	});

	const healthPromise = waitForEvent(tempNodeEvents, `${nodeId}:health`, {
		predicate: (health) => {
			if (!health) return null;
			else return health === "healthy" || undefined;
		},
		timeout: 120000,
	});

	try {
		sendCommandToWorker(workerId, "clab:deployLab", {
			sessionId: executionId,
			config: {
				ownerId: ctx.context.session.id,
				nodes: [
					{
						id: nodeId,
						name: data.name,
						image: data.image,
						kind: data.kind,
						env: data.env,
						resources: data.resources,
					},
				],
			},
		});
	} catch (error) {
		throw new Error(
			`Provisioning failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	ctx.reply("info", "Device provisioned.");

	const ip = await ipPromise;
	if (!ip) {
		throw new Error("Failed to retrieve container IP.");
	}

	// Health check
	ctx.reply("info", "Waiting for device to become healthy...");

	const isHealthy = await healthPromise;
	if (isHealthy) {
		ctx.reply("info", "Device is healthy.");
	} else if (isHealthy === null) {
		ctx.reply("warn", "Device does not have health check configured.");
		await sleep(2500);
	} else {
		ctx.reply("warn", "Device did not become healthy in time.");
	}

	ctx.reply("info", "Generating access token...");
	const token = guacamole.generateToken({
		type: data.connection.type,
		settings: {
			hostname: ip as string,
			port: data.connection.data.port.toString(),
			username: data.connection.data.username,
			password: data.connection.data.password,
		},
	});

	ctx.reply("info", "Access token generated.");
	ctx.reply("token", token);
});
