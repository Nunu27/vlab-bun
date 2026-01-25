import dbListener from "@backend/db/listener";
import env from "@backend/env";
import clab from "@backend/services/clab";
import docker from "@backend/services/docker";
import { createGuacamoleToken } from "@backend/utils/crypto";
import { getMonitorPorts } from "@vlab/monitor";
import {
	deviceWSSchemas,
	onDispose,
	type WSHandler
} from "@vlab/shared/schemas/ws";
import { sleep } from "bun";

const healthEmitter = dbListener.createEventEmitter(
	"labNodes",
	["id", "health"],
	(node) => node.id,
	(node) => node.health,
	{ ops: ["INSERT", "UPDATE"] }
);

const portEmitter = dbListener.createEventEmitter(
	"labNodes",
	["id", "ports"],
	(node) => node.id,
	(node) => node.ports,
	{ ops: ["INSERT"] }
);

const deviceWSHandler: WSHandler<typeof deviceWSSchemas> = {
	"device/test": async ({
		id,
		data,
		socket: {
			data: { session }
		},
		reply
	}) => {
		const labName = id.replace(/-/g, "");
		const nodeId = Bun.randomUUIDv7();

		// Image pull
		reply("message", `Pulling image ${data.image}...`);
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
		reply("message", "Image pulled successfully.");

		// Lab provisioning
		reply("message", "Provisioning device...");

		const healthPromise = healthEmitter.wait(
			nodeId,
			(health) => {
				if (!health) return null;
				else return health === "healthy" || undefined;
			},
			120000,
			false
		);
		const portPromise = portEmitter.wait(
			nodeId,
			(ports) => ports || null,
			120000,
			null
		);

		const originPorts = [
			data.connection.data.port,
			...getMonitorPorts(data.kind)
		];

		const { response } = await clab.deploy(labName, {
			sessionId: id,
			type: "device-test",
			ownerId: session.id,
			nodes: [
				{
					id: nodeId,
					name: data.name,
					image: data.image,
					kind: data.kind,
					env: data.env,
					ports: originPorts,
					resources: data.resources
				}
			]
		});

		if (!response.ok) {
			throw new Error("Error during device provisioning");
		}

		reply("message", "Device provisioned.");

		// Health check
		reply("message", "Waiting for device to become healthy...");

		const isHealthy = await healthPromise;
		if (isHealthy) {
			reply("message", "Device is healthy.");
		} else if (isHealthy === null) {
			reply("warn", "Device does not have health check configured.");
			await sleep(2500);
		} else {
			reply("warn", "Device did not become healthy in time.");
		}

		const ports = await portPromise;
		if (!ports) {
			throw new Error("Failed to retrieve device port mapping.");
		}

		// Access token generation
		reply("message", "Generating access token...");

		const token = createGuacamoleToken({
			connection: {
				type: data.connection.type,
				settings: {
					hostname: env.CLAB_HOST,
					port: ports[data.connection.data.port].toString(),
					username: data.connection.data.username,
					password: data.connection.data.password
				}
			}
		});

		reply("message", "Access token generated.");
		reply("token", token);
	}
};

onDispose("device/test", async (id) => {
	const labName = id.replace(/-/g, "");
	await clab.destroy(labName);
});

export default deviceWSHandler;
