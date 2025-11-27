import { deviceCategories } from "@backend/db/schema/lab-device";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { deleteFile, uploadFile } from "@backend/services/storage";
import { success } from "@backend/utils/response";
import { CreateDeviceCategoryRequest } from "./schema";

export default createRouter().post(
	"/",
	async ({ body, db }) => {
		const id = Bun.randomUUIDv7();
		const dependency = `device-category:${id}`;
		const file = await uploadFile(body.icon, dependency);

		try {
			const [deviceCategory] = await db
				.insert(deviceCategories)
				.values({
					id,
					...body,
					icon: file.name
				})
				.returning({ id: deviceCategories.id });

			await deleteCache("device:list", "device-category:pagination:*");

			return success({
				message: "Device category created",
				data: { id: deviceCategory.id }
			});
		} catch (error) {
			await deleteFile(file.name, dependency);

			throw error;
		}
	},
	{
		private: ["admin"],
		body: CreateDeviceCategoryRequest,
		detail: {
			description: "Create a new device category"
		}
	}
);
