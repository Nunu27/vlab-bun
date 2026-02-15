import clab from "@api/services/clab";
import docker from "@api/services/docker";
import { tempNodeEvents } from "@api/services/events";
import guacamole from "@api/services/guacamole";
import ws from "@api/services/ws";
import { waitForEvent } from "@api/utils/events";
import { sleep } from "bun";

ws.server.onDispose("device-template:test", async ({ executionId }) => {
	await clab.destroyLab(executionId);
});

ws.server.on(
	"device-template:test",
	async ({ data, socket, executionId, reply }) => {
		if (!executionId) throw new Error("Execution ID not provided");
		const nodeId = Bun.randomUUIDv7();

		reply("info", `Pulling image ${data.image}...`);

		await new Promise<void>((resolve, reject) => {
			docker.pull(data.image, {}, (err, stream) => {
				if (err || !stream) {
					return reject(err ?? new Error("Image pull failed"));
				}
				docker.modem.followProgress(stream, (err) => {
					if (err) return reject(err);
					resolve();
				});
			});
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

		const { response } = await clab.deployLab(executionId, {
			ownerId: socket.data.session.id,
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
		});

		if (!response.ok) {
			throw new Error("Error during device provisioning");
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
		const token = guacamole.generateToken({
			type: data.connection.type,
			settings: {
				hostname: ip,
				port: data.connection.data.port.toString(),
				username: data.connection.data.username,
				password: data.connection.data.password,
			},
		});

		reply("info", "Access token generated.");
		reply("token", token);
	},
);
