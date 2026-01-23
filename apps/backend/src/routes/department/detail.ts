import { createRouter } from "@backend/plugins/services";
import { failure, success } from "@backend/utils/response";
import { RequestWithId } from "@vlab/shared/schemas/common";

export default createRouter().guard(
	{
		cached: true,
		private: ["admin"],
		params: RequestWithId,
		detail: {
			description: "Get department detail"
		}
	},
	(app) =>
		app
			.resolve(({ params }) => ({
				cacheKey: `department:${params.id}`
			}))
			.get("/:id", async ({ params, db, status }) => {
				const { id } = params;

				const data = await db.query.departments.findFirst({
					where: (departments, { eq }) => eq(departments.id, id)
				});

				if (!data) {
					return status(404, failure({ message: "Department not found" }));
				}

				return success({
					data
				});
			})
);
