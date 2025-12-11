import { labs } from "@backend/db/schema/lab";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { failure, success } from "@backend/utils/response";
import { and, eq } from "drizzle-orm";

export default createRouter().delete(
	"/:id",
	async ({ params, session, db, status }) => {
		const { id } = params;

		const { rowCount } = await db
			.delete(labs)
			.where(and(eq(labs.id, id), eq(labs.authorId, session.data.id)));
		if (!rowCount) {
			return status(
				404,
				failure({
					message:
						"Lab not found or you don't have permission to delete this lab"
				})
			);
		}

		await deleteCache("lab:pagination:*");

		return success({ message: "Lab deleted" });
	},
	{
		private: ["lecturer"],
		detail: {
			description: "Delete a lab"
		}
	}
);
