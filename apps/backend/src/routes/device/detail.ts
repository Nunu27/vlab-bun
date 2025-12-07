import { createRouter } from "@backend/plugins/services";
import { failure, success } from "@backend/utils/response";
import { RequestWithId } from "../schema";

export default createRouter().guard(
	{
		cached: true,
		private: ["admin"],
		params: RequestWithId,
		detail: {
			description: "Get device detail"
		}
	},
	(app) =>
		app
			.resolve(({ params }) => ({
				cacheKey: `device:${params.id}`
			}))
			.get("/:id", async ({ params, db, status }) => {
				const { id } = params;

				const data = await db.query.devices.findFirst({
					where: (devices, { eq }) => eq(devices.id, id)
				});

				if (!data) {
					return status(404, failure({ message: "Device not found" }));
				}

				return success({
					data
				});
			})
);
