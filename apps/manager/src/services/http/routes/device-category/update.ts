import { failure, success } from "@jawit/common";
import db from "@manager/db";
import { deviceCategories } from "@manager/db/schema/device-template";
import auth from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { getAffectedCount } from "@manager/utils/db";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { UpdateDeviceCategoryRequest } from "@vlab/shared/schemas/device-category";
import { eq } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.put(
		"/:id",
		async ({ params: { id }, body, status, entity: { label } }) => {
			const relatedTemplates = await db.query.deviceTemplates.findMany({
				where: (t, { eq }) => eq(t.deviceCategoryId, id),
				columns: { id: true },
			});

			const rowCount = await getAffectedCount(
				db
					.update(deviceCategories)
					.set(body)
					.where(eq(deviceCategories.id, id))
					.$dynamic(),
			);

			if (rowCount) {
				const templateKeys = relatedTemplates.map(
					(t) => `device-template:${t.id}`,
				);

				await cache.delete("device-template:list", ...templateKeys);

				return success({ message: `${label} updated` });
			} else return status(404, failure({ message: `${label} not found` }));
		},
		{
			private: ["admin"],
			params: RequestWithId(),
			body: UpdateDeviceCategoryRequest,
		},
	);
