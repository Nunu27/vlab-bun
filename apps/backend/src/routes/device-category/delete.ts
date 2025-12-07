import { deviceCategories } from "@backend/db/schema/lab-device";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { deleteFile } from "@backend/services/storage";
import { failure, success } from "@backend/utils/response";
import { eq } from "drizzle-orm";
import { RequestWithId } from "../schema";

export default createRouter().delete(
	"/:id",
	async ({ params, db, status }) => {
		const { id } = params;
		const dependency = `device-category:${id}`;

		const deleted = await db.transaction(async (tx) => {
			const [deviceCategory] = await tx
				.delete(deviceCategories)
				.where(eq(deviceCategories.id, id))
				.returning({ icon: deviceCategories.icon });
			if (!deviceCategory) return false;

			await deleteFile(deviceCategory.icon, dependency);

			return true;
		});
		if (!deleted) {
			return status(404, failure({ message: "Device category not found" }));
		}

		await deleteCache(
			"device:list",
			"device-category:pagination:*",
			dependency
		);

		return success({ message: "Device category deleted" });
	},
	{
		private: ["admin"],
		params: RequestWithId,
		detail: {
			description: "Delete a device category"
		}
	}
);
