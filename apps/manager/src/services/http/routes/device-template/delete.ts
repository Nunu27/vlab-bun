import { responses } from "@jawit/common";
import db from "@manager/db";
import { deviceTemplates } from "@manager/db/schema/device-template";
import auth from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { getAffectedCount } from "@manager/utils/db";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { eq } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.delete(
		"/:id",
		async ({ params: { id }, status, ENTITY: { LABEL: label, KEY: key } }) => {
			const rowCount = await getAffectedCount(
				db.delete(deviceTemplates).where(eq(deviceTemplates.id, id)).$dynamic(),
			);

			if (rowCount) {
				await cache.delete(`${key}:list`, `${key}:${id}`);

				return responses.deleted(label);
			} else {
				return status(404, responses.notFound(label));
			}
		},
		{
			private: ["admin"],
			params: RequestWithId(),
		},
	);
