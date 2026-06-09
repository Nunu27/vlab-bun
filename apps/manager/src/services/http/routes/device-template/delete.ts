import { failure, success } from "@jawit/common";
import db from "@manager/db";
import { deviceTemplates } from "@manager/db/schema/device-template";
import auth from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { eq } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.delete(
		"/:id",
		async ({ params: { id }, status, entity: { label, key } }) => {
			const { rowCount } = await db
				.delete(deviceTemplates)
				.where(eq(deviceTemplates.id, id));

			if (rowCount) {
				await cache.delete(
					`${key}:list`,
					`${key}:pagination:*`,
					`${key}:${id}`,
				);

				return success({ message: `${label} deleted` });
			} else {
				return status(404, failure({ message: `${label} not found` }));
			}
		},
		{
			private: ["admin"],
			params: RequestWithId(),
		},
	);
