import { WSHandler } from "@backend/services/ws/schema";
import deviceWSSchemas from "./schema";
import clab, { clabWrapper } from "@backend/services/clab";
import { leasePort } from "@backend/services/port-manager";
import { createGuacamoleToken } from "@backend/utils/crypto";
import env from "@backend/env";
import db from "@backend/db";
import { deviceTestSessions } from "@backend/db/schema";

const deviceWSHandler: WSHandler<typeof deviceWSSchemas> = {
	"device/test": async (socket, data, reply) => {
		reply("message", "Provisioning device...");

		const deviceName = data.name.replaceAll(/\s+/, "-");

		await db.transaction(async (tx) => {
			const port = await leasePort();

			await tx.insert(deviceTestSessions).values({
				name: data.name,
				socketId: socket.id,
				leasedPorts: [port]
			});

			const response = await clabWrapper(() =>
				clab.POST("/api/v1/labs", {
					body: {
						topologyContent: {
							name: `device-${socket.id}`,
							topology: {
								nodes: {
									[deviceName]: {
										image: data.image,
										kind: data.kind,
										env: data.env,
										cpu: data.resources.cpu,
										memory: data.resources.memory,
										ports: [`${port}:${data.connection.data.port}`]
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
		});
	}
};

export default deviceWSHandler;
