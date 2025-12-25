import { users } from "@backend/db/schema/auth";
import { deleteCache } from "@backend/middlewares/caching";
import { deleteSession } from "@backend/middlewares/session";
import { createRouter } from "@backend/plugins/services";
import { failure, success } from "@backend/utils/response";
import { RequestWithId } from "@vlab/shared/schemas";
import { and, eq } from "drizzle-orm";

export default createRouter().delete(
	"/:id",
	async ({ params, db, status }) => {
		const { id } = params;

		const { rowCount } = await db
			.delete(users)
			.where(and(eq(users.id, id), eq(users.role, "lecturer")));
		if (!rowCount) {
			return status(404, failure({ message: "Lecturer not found" }));
		}

		await deleteCache("lecturer:pagination:*", `lecturer:${id}`, `me:${id}`);
		await deleteSession(id);

		return success({ message: "Lecturer deleted" });
	},
	{
		private: ["admin"],
		params: RequestWithId,
		detail: {
			description: "Delete a lecturer"
		}
	}
);
