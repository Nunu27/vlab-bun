import { deviceCategories } from "@backend/db/schema/lab-device";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { success } from "@backend/utils/response";
import { CreateDeviceCategoryRequest } from "@vlab/shared/schemas/rest";

export default createRouter().post(
	"/",
	async ({ body, db }) => {
		const [{ id }] = await db
			.insert(deviceCategories)
			.values(body)
			.returning({ id: deviceCategories.id });
		await deleteCache("device:list", "device-category:pagination:*");

		return success({
			message: "Device category created",
			data: { id }
		});
	},
	{
		private: ["admin"],
		body: CreateDeviceCategoryRequest,
		detail: {
			description: "Create a new device category"
		}
	}
);
