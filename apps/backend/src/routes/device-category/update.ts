import { deviceCategories } from "@backend/db/schema/lab-device";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { failure, success } from "@backend/utils/response";
import { eq } from "drizzle-orm";
import {
	RequestWithId,
	UpdateDeviceCategoryRequest
} from "@vlab/shared/schemas";

export default createRouter().put(
	"/:id",
	async ({ params, body, db, status }) => {
		const { id } = params;

		const { rowCount } = await db
			.update(deviceCategories)
			.set(body)
			.where(eq(deviceCategories.id, id));

		if (!rowCount) {
			return status(404, failure({ message: "Device category not found" }));
		}

		await deleteCache(
			"device:list",
			"device-category:pagination:*",
			`device-category:${id}`
		);

		return success({ message: "Device category updated" });
	},
	{
		private: ["admin"],
		params: RequestWithId,
		body: UpdateDeviceCategoryRequest,
		detail: {
			description: "Update a device category"
		}
	}
);
