import { fileDependencies } from "@backend/db/schema";
import { deviceCategories } from "@backend/db/schema/lab-device";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { deleteFile, uploadFile } from "@backend/services/storage";
import { failure, success } from "@backend/utils/response";
import { and, eq, ne } from "drizzle-orm";
import { RequestWithId } from "../schema";
import { UpdateDeviceCategoryRequest } from "@vlab/shared/schemas";

export default createRouter().put(
	"/:id",
	async ({ params, body, db, status }) => {
		const { id } = params;
		const dependency = `device-category:${id}`;
		const file = body.icon
			? await uploadFile(body.icon, dependency)
			: undefined;

		try {
			const rowCount = await db.transaction(async (tx) => {
				if (file) {
					await tx
						.delete(fileDependencies)
						.where(
							and(
								ne(fileDependencies.file, file.name),
								eq(fileDependencies.name, dependency)
							)
						);
				}

				const { rowCount } = await tx
					.update(deviceCategories)
					.set({
						...body,
						icon: file?.name
					})
					.where(eq(deviceCategories.id, id));

				return rowCount;
			});
			if (!rowCount) {
				if (file) {
					await deleteFile(file.name, dependency);
				}

				return status(404, failure({ message: "Device category not found" }));
			}

			await deleteCache(
				"device:list",
				"device-category:pagination:*",
				dependency
			);

			return success({
				message: "Device category updated"
			});
		} catch (error) {
			if (file) {
				await deleteFile(file.name, dependency);
			}

			throw error;
		}
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
