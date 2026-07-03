import db from "@manager/db";
import { workers } from "@manager/db/schema";
import { sendCommandToWorker, tempNodeEvents } from "@manager/services/grpc";
import guacamole from "@manager/services/guacamole-lite";
import ws from "@manager/services/ws";
import { waitForEvent } from "@manager/utils/events";
import type { Static } from "@sinclair/typebox";
import type { TestDeviceTemplateRequest } from "@vlab/ws/device-template";
import { sleep } from "bun";
import { eq, sql } from "drizzle-orm";

export async function testDeviceOnWorker(
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

		const healthPromise = waitForEvent(tempNodeEvents, `${nodeId}:health`, {
			predicate: (health) => {
				if (!health) return null;
				else return health === "healthy" || undefined;
			},
			timeout: 120000,
		});

		const deployedNodes = await sendCommandToWorker(
			workerId,
			"clab:deployLab",
			{
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
			},
		).catch((error) => {
			throw new Error(
				`Provisioning failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		});

		reply("info", "Device provisioned.");

		const deployed = deployedNodes.find((n) => n.id === nodeId);
		if (!deployed) {
			throw new Error("Failed to retrieve deployed device info.");
		}
		const { ip, containerId } = deployed;

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
		reply("response", token);

		// Measure container resource usage and emit as suggested cost values
		await sleep(3000); // let CPU settle after boot
		const stats = await sendCommandToWorker(
			workerId,
			"docker:measureContainerStats",
			{ containerId },
		);
		reply("stats", stats);
	} catch (error) {
		reply("error", error instanceof Error ? error.message : String(error));
		throw error;
	}
}

export async function cleanupDeviceTest(
	workerId: string,
	payload: {
		sessionId: string;
	},
) {
	await sendCommandToWorker(workerId, "clab:destroyLab", {
		sessionId: payload.sessionId,
	});

	await db
		.update(workers)
		.set({ activeLabs: sql`GREATEST(${workers.activeLabs} - 1, 0)` })
		.where(eq(workers.id, workerId));
}
