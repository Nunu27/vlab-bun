import { createRouter } from "@backend/plugins/services";
import { failure, success } from "@backend/utils/response";
import { RequestWithId } from "@vlab/shared/schemas";

export default createRouter().guard(
	{
		cached: true,
		private: ["student", "lecturer"],
		params: RequestWithId,
		detail: {
			description: "Get lab detail"
		}
	},
	(app) =>
		app
			.resolve(({ params }) => ({
				cacheKey: `lab:${params.id}`
			}))
			.get("/:id", async ({ params, db, status }) => {
				const { id } = params;

				const data = await db.query.labs.findFirst({
					where: (labs, { eq }) => eq(labs.id, id)
				});
				if (!data) {
					return status(404, failure({ message: "Lab not found" }));
				}

				return success({
					data
				});
			})
);
