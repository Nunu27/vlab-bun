import db from "@api/db";
import { deviceCategories } from "@api/db/schema/device-template";
import auth from "@api/middlewares/auth";
import { cache } from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import { success } from "@jawit/common";
import { CreateDeviceCategoryRequest } from "@vlab/shared/schemas/device-category";

export default createRouter()
	.use(auth)
	.post(
		"/",
		async ({ body, entity: { label, key } }) => {
			const [{ id }] = await db
				.insert(deviceCategories)
				.values(body)
				.returning({ id: deviceCategories.id });
			await cache.delete("device:list", `${key}:pagination:*`);

			return success({ message: `${label} created`, data: { id } });
		},
		{
			private: ["admin"],
			body: CreateDeviceCategoryRequest,
		},
	);
