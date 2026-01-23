import { users } from "@backend/db/schema/auth";
import { deleteCache } from "@backend/middlewares/caching";
import { deleteSession } from "@backend/middlewares/session";
import { createRouter } from "@backend/plugins/services";
import { failure, success } from "@backend/utils/response";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { and, eq } from "drizzle-orm";

export default createRouter().delete(
	"/:id",
	async ({ params, db, status }) => {
		const { id } = params;

		const { rowCount } = await db
			.delete(users)
			.where(and(eq(users.id, id), eq(users.role, "student")));
		if (!rowCount) {
			return status(404, failure({ message: "Student not found" }));
		}

		await deleteCache("student:pagination:*", `student:${id}`, `me:${id}`);
		await deleteSession(id);

		return success({ message: "Student deleted" });
	},
	{
		private: ["admin"],
		params: RequestWithId,
		detail: {
			description: "Delete a student"
		}
	}
);
