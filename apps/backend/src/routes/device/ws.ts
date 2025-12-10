import db from "@backend/db";
import { addDBListener } from "@backend/db/listener";
import { labNodes } from "@backend/db/schema";
import env from "@backend/env";
import clab, { clabWrapper } from "@backend/services/clab";
import { leasePort } from "@backend/services/port-manager";
import { createGuacamoleToken } from "@backend/utils/crypto";
import { encode } from "@msgpack/msgpack";
import { LABELS } from "@backend/constants";
import {
	deviceWSSchemas,
	onDispose,
	type WSHandler
} from "@vlab/shared/schemas";
import { eq } from "drizzle-orm";
import { EventEmitter } from "events";
import docker from "@backend/services/docker";
import type { NodeHealth } from "@vlab/shared/enums";

const labNodeEvents = new EventEmitter();
addDBListener(
	"labNodes",
	["health", "id", "updatedAt"],
	async ({ data: { current } }) => {
		if (current) {
			labNodeEvents.emit(`update:${current.id}`, current.health);
		}
	},
	{ ops: ["INSERT", "UPDATE"] }
);

function waitForHealth(nodeId: string, timeoutMs = 120000) {
	return new Promise<NodeHealth | null>(async (resolve) => {
		let resolved = false;
		let currentHealth: NodeHealth | null = null;

		const onUpdate = (health: any) => {
			currentHealth = health;

			if (!health || health === "healthy") {
				resolved = true;
				cleanup();
			}
		};

		const cleanup = () => {
			resolve(currentHealth);
			labNodeEvents.off(`update:${nodeId}`, onUpdate);
			clearTimeout(timer);
		};

		const timer = setTimeout(() => {
			if (!resolved) {
				cleanup();
			}
		}, timeoutMs);

		labNodeEvents.on(`update:${nodeId}`, onUpdate);

		const labNode = await db.query.labNodes.findFirst({
			where: eq(labNodes.id, nodeId),
			columns: {
				health: true
			}
		});

		if ((!labNode?.health || labNode?.health === "healthy") && !resolved) {
			cleanup();
			resolve(labNode?.health || null);
		}
	});
}

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

		const deviceName = data.name.replace(/\s+/g, "-").toLowerCase();
		const labName = `device-${id.replace(/-/g, "")}`;
		const port = await leasePort();
		const nodeId = Bun.randomUUIDv7();

		try {
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
										[LABELS.OWNER_ID]: session.id,
										[LABELS.LAB_PORTS]: encode([port]).toBase64()
									}
								},
								nodes: {
									[deviceName]: {
										image: data.image,
										kind: data.kind,
										env: data.env,
										cpu: data.resources.cpu,
										memory: data.resources.memory,
										ports: [`${port}:${data.connection.data.port}`],
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
			const health = await waitForHealth(nodeId);
			if (health === "healthy") {
				reply("message", "Device is healthy.");
			} else if (!health) {
				reply("warn", "Device does not have health check configured.");
				await new Promise((res) => setTimeout(res, 5000));
			} else {
				reply(
					"warn",
					"Device did not become healthy in time. Health status: " + health
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
		} catch (error) {
			await clabWrapper(() =>
				clab.DELETE(`/api/v1/labs/{labName}`, {
					params: {
						path: {
							labName: labName
						},
						query: {
							cleanup: true
						}
					}
				})
			);

			throw error;
		}
	}
};

onDispose("device/test", async (id) => {
	const labName = `device-${id.replace(/-/g, "")}`;

	await clabWrapper(() =>
		clab.DELETE(`/api/v1/labs/{labName}`, {
			params: {
				path: {
					labName
				},
				query: {
					cleanup: true
				}
			}
		})
	);
});

export default deviceWSHandler;
