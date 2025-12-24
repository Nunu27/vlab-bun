import { LABELS } from "@backend/constants";
import { createDBEventEmitter } from "@backend/db/listener";
import env from "@backend/env";
import clab, { clabWrapper } from "@backend/services/clab";
import docker from "@backend/services/docker";
import { createGuacamoleToken } from "@backend/utils/crypto";
import { toKebabCase } from "@backend/utils/string";
import {
	deviceWSSchemas,
	onDispose,
	type WSHandler
} from "@vlab/shared/schemas";
import { sleep } from "@vlab/shared/utils";

const healthEmitter = createDBEventEmitter(
	"labNodes",
	["id", "health"],
	(node) => node.id,
	(node) => node.health,
	{ ops: ["INSERT", "UPDATE"] }
);

const portEmitter = createDBEventEmitter(
	"labNodes",
	["id", "ports"],
	(node) => node.id,
	(node) => node.ports,
	{ ops: ["INSERT", "UPDATE"] }
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
		reply("message", "Provisioning device...");

		const deviceName = toKebabCase(data.name);
		const labName = id.replace(/-/g, "");
		const nodeId = Bun.randomUUIDv7();

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
			(ports) => ports[data.connection.data.port] || null,
			120000,
			null
		);

		const response = await clabWrapper(() =>
			clab.POST("/api/v1/labs", {
				body: {
					topologyContent: {
						name: labName,
						topology: {
							defaults: {
								labels: {
									[LABELS.SESSION_ID]: id,
									[LABELS.LAB_TYPE]: "device-test",
									[LABELS.OWNER_ID]: session.id
								}
							},
							nodes: {
								[deviceName]: {
									image: data.image,
									kind: data.kind,
									env: data.env,
									cpu: data.resources.cpu,
									memory: data.resources.memory,
									ports: [`0:${data.connection.data.port}`],
									labels: {
										[LABELS.NODE_ID]: nodeId
									}
								}
							}
						}
					}
				}
			})
		);

		if (!response.response.ok) {
			throw new Error(
				`Error during device provisioning: ${response.response.statusText}`
			);
		}

		reply("message", "Device provisioned.");

		reply("message", "Waiting for device to become healthy...");

		const isHealthy = await healthPromise;
		if (isHealthy) {
			reply("message", "Device is healthy.");
		} else if (isHealthy === null) {
			reply("warn", "Device does not have health check configured.");
			await sleep(5000);
		} else {
			reply(
				"warn",
				"Device did not become healthy in time. Health status: " + isHealthy
			);
		}

		reply("message", "Checking evaluation service access...");
		const evaluationCanAccess = false;

		if (evaluationCanAccess) {
			reply("message", "Evaluation service can access the device.");
		} else {
			reply("warn", "Evaluation service cannot access the device.");
		}

		reply("message", "Generating access token...");

		const port = await portPromise;
		if (port === null) {
			throw new Error("Failed to retrieve device port mapping.");
		}

		const token = createGuacamoleToken({
			connection: {
				type: data.connection.type,
				settings: {
					hostname: env.CLAB_HOST,
					port: port.toString(),
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

	await clabWrapper(() =>
		clab.DELETE(`/api/v1/labs/{labName}`, {
			params: {
				path: { labName },
				query: { cleanup: true }
			}
		})
	);
});

export default deviceWSHandler;
