import { devices } from "@backend/db/schema";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { deleteFile, uploadFile } from "@backend/services/storage";
import { success } from "@backend/utils/response";
import { CreateDeviceRequest } from "./schema";

export default createRouter().post(
	"/",
	async ({ body, db }) => {
		const id = Bun.randomUUIDv7();
		const dependency = `device:${id}`;

		const file = await uploadFile(body.icon, dependency);

		try {
			const [device] = await db
				.insert(devices)
				.values({
					id,
					...body,
					icon: file.name
				})
				.returning({ id: devices.id });

			await deleteCache("device:list", "device:pagination:*");

			return success({
				message: "Device created",
				data: { id: device.id }
			});
		} catch (error) {
			await deleteFile(file.name, dependency);

			throw error;
		}
	},
	{
		private: ["admin"],
		body: CreateDeviceRequest,
		detail: {
			description: "Create a new device"
		}
	}
);
