import { labs } from "@backend/db/schema/lab";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { success } from "@backend/utils/response";
import { LabRequest } from "@vlab/shared/schemas/rest";

export default createRouter().post(
	"/",
	async ({ body, db, session }) => {
		const [{ id }] = await db
			.insert(labs)
			.values({
				...body,
				authorId: session.data.id
			})
			.returning({ id: labs.id });
		await deleteCache("lab:pagination:*");

		return success({
			message: "Lab created",
			data: { id }
		});
	},
	{
		private: ["lecturer"],
		body: LabRequest,
		detail: {
			description: "Create a new lab"
		}
	}
);
