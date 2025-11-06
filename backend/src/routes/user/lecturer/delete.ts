import { users } from "@backend/db/schema/auth";
import { createRouter } from "@backend/plugins/services";
import { failure, success } from "@backend/utils/response";
import { and, eq } from "drizzle-orm";

export default createRouter().delete(
	"/:id",
	async ({ params, db, status }) => {
		const { id } = params;

		const { rowCount } = await db
			.delete(users)
			.where(and(eq(users.id, id), eq(users.role, "lecturer")));
		if (rowCount === 0) {
			return status(404, failure({ message: "Lecturer not found" }));
		}

		return success({ message: "Lecturer deleted" });
	},
	{
		private: ["admin"],
		detail: {
			description: "Delete a lecturer"
		}
	}
);
