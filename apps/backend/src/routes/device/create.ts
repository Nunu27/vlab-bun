import { devices } from "@backend/db/schema";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { success } from "@backend/utils/response";
import { CreateDeviceRequest } from "@vlab/shared/schemas/rest";

export default createRouter().post(
	"/",
	async ({ body, db }) => {
		const [{ id }] = await db
			.insert(devices)
			.values(body)
			.returning({ id: devices.id });
		await deleteCache("device:list", "device:pagination:*");

		return success({
			message: "Device created",
			data: { id }
		});
	},
	{
		private: ["admin"],
		body: CreateDeviceRequest,
		detail: {
			description: "Create a new device"
		}
	}
);
