import { fileDependencies } from "@backend/db/schema";
import { devices } from "@backend/db/schema/lab-device";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { deleteFile, uploadFile } from "@backend/services/storage";
import { failure, success } from "@backend/utils/response";
import { and, eq, ne } from "drizzle-orm";
import { RequestWithId } from "../schema";
import { UpdateDeviceRequest } from "@vlab/shared/schemas";

export default createRouter().put(
	"/:id",
	async ({ params, body, db, status }) => {
		const { id } = params;
		const dependency = `device:${id}`;
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
					.update(devices)
					.set({
						...body,
						icon: file?.name
					})
					.where(eq(devices.id, id));

				return rowCount;
			});
			if (!rowCount) {
				if (file) {
					await deleteFile(file.name, dependency);
				}

				return status(404, failure({ message: "Device not found" }));
			}

			await deleteCache("device:list", "device:pagination:*", dependency);

			return success({
				message: "Device updated"
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
		body: UpdateDeviceRequest,
		detail: {
			description: "Update a device"
		}
	}
);
