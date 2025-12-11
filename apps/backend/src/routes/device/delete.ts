import { devices } from "@backend/db/schema/lab-device";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { failure, success } from "@backend/utils/response";
import { eq } from "drizzle-orm";

export default createRouter().delete(
	"/:id",
	async ({ params, db, status }) => {
		const { id } = params;

		const { rowCount } = await db.delete(devices).where(eq(devices.id, id));
		if (!rowCount) {
			return status(404, failure({ message: "Device not found" }));
		}

		await deleteCache("device:list", "device:pagination:*");

		return success({ message: "Device deleted" });
	},
	{
		private: ["admin"],
		detail: {
			description: "Delete a device"
		}
	}
);
