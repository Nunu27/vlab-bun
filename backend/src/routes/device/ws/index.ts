import db from "@backend/db";
import { deviceTestSessions } from "@backend/db/schema";
import env from "@backend/env";
import clab, { clabWrapper } from "@backend/services/clab";
import { leasePort, releasePort } from "@backend/services/port-manager";
import type { WSHandler } from "@backend/services/ws/schema";
import { createGuacamoleToken } from "@backend/utils/crypto";
import deviceWSSchemas from "./schema";

const deviceWSHandler: WSHandler<typeof deviceWSSchemas> = {
	"device/test": async (socket, data, reply) => {
		reply("message", "Provisioning device...");

		const id = Bun.randomUUIDv7();
		const deviceName = data.name.replace(/\s+/g, "-");
		const sessionName = `device-${id}`;
		const port = await leasePort();

		try {
			await db.transaction(async (tx) => {
				await tx.insert(deviceTestSessions).values({
					id,
					socketId: socket.id,
					leasedPorts: [port]
				});

				const response = await clabWrapper(() =>
					clab.POST("/api/v1/labs", {
						body: {
							topologyContent: {
								name: sessionName,
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
		} catch (error) {
			reply("error", (error as Error).message);

			await clabWrapper(() =>
				clab.DELETE(`/api/v1/labs/{labName}`, {
					params: {
						path: {
							labName: sessionName
						},
						query: {
							cleanup: true
						}
					}
				})
			);
			await releasePort(port);
		}
	}
};

export default deviceWSHandler;
