import db from "@api/db";
import { deviceTemplates } from "@api/db/schema/device-template";
import auth from "@api/middlewares/auth";
import { cache } from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import { failure, success } from "@jawit/common";
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
