import db from "@backend/db";
import { deviceTestSessions } from "@backend/db/schema/lab-device";
import env from "@backend/env";
import clab, { clabWrapper } from "@backend/services/clab";
import { leasePort, releasePort } from "@backend/services/port-manager";
import { createGuacamoleToken } from "@backend/utils/crypto";
import {
	deviceWSSchemas,
	onDispose,
	type WSHandler
} from "@vlab/shared/schemas";
import { eq } from "drizzle-orm";

const deviceWSHandler: WSHandler<typeof deviceWSSchemas> = {
	"device/test": async ({ id, data, reply }) => {
		reply("message", "Provisioning device...");

		const deviceName = data.name.replace(/\s+/g, "-").toLowerCase();
		const sessionName = `device-${id}`;
		const port = await leasePort();

		try {
			await db.transaction(async (tx) => {
				await tx.insert(deviceTestSessions).values({
					id,
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
			});
		} catch (error) {
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

			throw error;
		}
	}
};

onDispose("device/test", async (id) => {
	const [session] = await db
		.select()
		.from(deviceTestSessions)
		.where(eq(deviceTestSessions.id, id));

	if (!session) return;

	await clabWrapper(() =>
		clab.DELETE(`/api/v1/labs/{labName}`, {
			params: {
				path: {
					labName: `device-${id}`
				},
				query: {
					cleanup: true
				}
			}
		})
	);

	for (const port of session.leasedPorts) {
		await releasePort(port);
	}

	await db.delete(deviceTestSessions).where(eq(deviceTestSessions.id, id));
});

export default deviceWSHandler;
