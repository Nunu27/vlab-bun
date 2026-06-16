import { responses } from "@jawit/common";
import db from "@manager/db";
import { deviceTemplates } from "@manager/db/schema/device-template";
import auth from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { CreateDeviceTemplateRequest } from "@vlab/shared/schemas/device-template";

export default createRouter()
	.use(auth)
	.post(
		"/",
		async ({ body, ENTITY: { LABEL: label, KEY: key } }) => {
			const [{ id }] = await db
				.insert(deviceTemplates)
				.values(body)
				.returning({ id: deviceTemplates.id });
			await cache.delete(`${key}:list`);

			return responses.created(label, { id });
		},
		{ private: ["admin"], body: CreateDeviceTemplateRequest },
	);
