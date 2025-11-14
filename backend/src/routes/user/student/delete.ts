import { users } from "@backend/db/schema/auth";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { failure, success } from "@backend/utils/response";
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

		await deleteCache("student:pagination:*", `student:${id}`);

		return success({ message: "Student deleted" });
	},
	{
		private: ["admin"],
		detail: {
			description: "Delete a student"
		}
	}
);
