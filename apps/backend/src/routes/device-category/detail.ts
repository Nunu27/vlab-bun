import { createRouter } from "@backend/plugins/services";
import { failure, success } from "@backend/utils/response";
import { RequestWithId } from "../schema";

export default createRouter().guard(
	{
		cached: true,
		private: ["admin"],
		params: RequestWithId,
		detail: {
			description: "Get device category detail"
		}
	},
	(app) =>
		app
			.resolve(({ params }) => ({
				cacheKey: `device-category:${params.id}`
			}))
			.get("/:id", async ({ params, db, status }) => {
				const { id } = params;

				const data = await db.query.deviceCategories.findFirst({
					where: (deviceCategories, { eq }) => eq(deviceCategories.id, id)
				});

				if (!data) {
					return status(404, failure({ message: "Device category not found" }));
				}

				return success({
					data
				});
			})
);
