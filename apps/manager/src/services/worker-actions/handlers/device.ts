import db from "@manager/db";
import { sendCommandToWorker, tempNodeEvents } from "@manager/services/grpc";
import guacamole from "@manager/services/guacamole-lite";
import ws from "@manager/services/ws";
import { waitForEvent } from "@manager/utils/events";
import type { Static } from "@sinclair/typebox";
import type { TestDeviceTemplateRequest } from "@vlab/ws/device-template";
import { sleep } from "bun";

export async function handleTestInit(
	workerId: string,
	payload: {
		connectionId: string;
		requestId: string;
		userId: string;
		data: Static<typeof TestDeviceTemplateRequest>;
	},
) {
	const data = payload.data;
	const executionId = payload.requestId;
	const nodeId = Bun.randomUUIDv7();

	const reply = ws.server.reply("device-template:test", payload.requestId);

	try {
		reply("info", `Pulling image ${data.image}...`);

		await sendCommandToWorker(workerId, "docker:pullImage", {
			image: data.image,
		});

		reply("info", "Image pulled successfully.");

		// Lab provisioning
		reply("info", "Provisioning device...");

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
			await sendCommandToWorker(workerId, "clab:deployLab", {
				sessionId: executionId,
				config: {
					ownerId: payload.userId,
					nodes: [
						{
							id: nodeId,
							name: data.name,
							image: data.image,
							kind: data.kind,
							env: data.env,
							resources: data.resources,
							credentials: {
								username: data.connection.data.username,
								password: data.connection.data.password,
							},
						},
					],
				},
			});
		} catch (error) {
			throw new Error(
				`Provisioning failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		reply("info", "Device provisioned.");

		const ip = await ipPromise;
		if (!ip) {
			throw new Error("Failed to retrieve container IP.");
		}

		// Health check
		reply("info", "Waiting for device to become healthy...");

		const isHealthy = await healthPromise;
		if (isHealthy) {
			reply("info", "Device is healthy.");
		} else if (isHealthy === null) {
			reply("warn", "Device does not have health check configured.");
			await sleep(2500);
		} else {
			reply("warn", "Device did not become healthy in time.");
		}

		reply("info", "Generating access token...");

		const worker = await db.query.workers.findFirst({
			columns: { guacdHost: true, guacdPort: true },
			where: (w, { eq }) => eq(w.id, workerId),
		});

		if (!worker) throw new Error("Worker not found");

		const token = guacamole.generateNodeToken(
			data.connection,
			data.kind,
			ip,
			worker.guacdHost,
			worker.guacdPort,
		);

		reply("info", "Access token generated.");
		ws.server.replyResponse("device-template:test", executionId, token);
	} catch (error) {
		ws.server.replyError(
			"device-template:test",
			executionId,
			error instanceof Error ? error.message : String(error),
		);
		throw error;
	}
}

export async function handleTestCleanup(
	workerId: string,
	payload: {
		sessionId: string;
	},
) {
	await sendCommandToWorker(workerId, "clab:destroyLab", {
		sessionId: payload.sessionId,
	});
}
