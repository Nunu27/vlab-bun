import { devices } from "@backend/db/schema/lab-device";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { failure, success } from "@backend/utils/response";
import { RequestWithId } from "@shared/schemas/common";
import { UpdateDeviceRequest } from "@vlab/shared/schemas/rest";
import { eq } from "drizzle-orm";

export default createRouter().put(
	"/:id",
	async ({ params, body, db, status }) => {
		const { id } = params;

		const { rowCount } = await db
			.update(devices)
			.set(body)
			.where(eq(devices.id, id));

		if (!rowCount) {
			return status(404, failure({ message: "Device not found" }));
		}

		await deleteCache("device:list", "device:pagination:*", `device:${id}`);

		return success({ message: "Device updated" });
	},
	{
		private: ["admin"],
		params: RequestWithId,
		body: UpdateDeviceRequest,
		detail: {
			description: "Update a device"
		}
	}
);
