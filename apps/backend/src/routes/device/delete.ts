import { devices } from "@backend/db/schema/lab-device";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { deleteFile } from "@backend/services/storage";
import { failure, success } from "@backend/utils/response";
import { eq } from "drizzle-orm";

export default createRouter().delete(
	"/:id",
	async ({ params, db, status }) => {
		const { id } = params;
		const dependency = `device:${id}`;

		const deleted = await db.transaction(async (tx) => {
			const [device] = await tx
				.delete(devices)
				.where(eq(devices.id, id))
				.returning({ icon: devices.icon });
			if (!device) return false;

			await deleteFile(device.icon, dependency);

			return true;
		});
		if (!deleted) {
			return status(404, failure({ message: "Device not found" }));
		}

		await deleteCache("device:list", "device:pagination:*", dependency);

		return success({ message: "Device deleted" });
	},
	{
		private: ["admin"],
		detail: {
			description: "Delete a device"
		}
	}
);
