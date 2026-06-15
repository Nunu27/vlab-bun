import { success } from "@jawit/common";
import db from "@manager/db";
import { deviceCategories } from "@manager/db/schema/device-template";
import auth from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
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
			await cache.delete("device-template:list", `${key}:pagination:*`);

			return success({ message: `${label} created`, data: { id } });
		},
		{
			private: ["admin"],
			body: CreateDeviceCategoryRequest,
		},
	);
