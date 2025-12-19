import { departments } from "@backend/db/schema/auth";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { failure, success } from "@backend/utils/response";
import { RequestWithId } from "@vlab/shared/schemas";
import { eq } from "drizzle-orm";

export default createRouter().delete(
	"/:id",
	async ({ params, db, status }) => {
		const { id } = params;

		const { rowCount } = await db
			.delete(departments)
			.where(eq(departments.id, id));
		if (!rowCount) {
			return status(404, failure({ message: "Department not found" }));
		}

		await deleteCache("department:pagination:*", `department:${id}`);

		return success({ message: "Department deleted" });
	},
	{
		private: ["admin"],
		params: RequestWithId,
		detail: {
			description: "Delete a department"
		}
	}
);
