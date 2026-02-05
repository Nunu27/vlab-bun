import db from "@api/db";
import { deviceTemplates } from "@api/db/schema/device-template";
import auth from "@api/middlewares/auth";
import { cache } from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import { success } from "@jawit/common";
import { CreateDeviceTemplateRequest } from "@vlab/shared/schemas/device-template";

export default createRouter()
	.use(auth)
	.post(
		"/",
		async ({ body, entity: { label, key } }) => {
			const [{ id }] = await db
				.insert(deviceTemplates)
				.values(body)
				.returning({ id: deviceTemplates.id });
			await cache.delete(`${key}:list`, `${key}:pagination:*`);

			return success({ message: `${label} created`, data: { id } });
		},
		{ private: ["admin"], body: CreateDeviceTemplateRequest },
	);
