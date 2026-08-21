import { failure, responses } from "@jawit/common";
import db from "@manager/db";
import { deviceTemplates } from "@manager/db/schema/device-template";
import { validateTemplateCost } from "@manager/domain/device-template/validate";
import auth from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { CreateDeviceTemplateRequest } from "@vlab/shared/schemas/device-template";

export default createRouter()
	.use(auth)
	.post(
		"/",
		async ({ body, status, ENTITY: { LABEL: label, KEY: key } }) => {
			const costError = validateTemplateCost(body);
			if (costError) return status(400, failure({ message: costError }));

			const [{ id }] = await db
				.insert(deviceTemplates)
				.values(body)
				.returning({ id: deviceTemplates.id });
			await cache.delete(`${key}:list`);

			return responses.created(label, { id });
		},
		{ private: ["admin"], body: CreateDeviceTemplateRequest },
	);
