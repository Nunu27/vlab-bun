import { users } from "@backend/db/schema/auth";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { RequestWithId } from "@backend/routes/schema";
import { failure, success } from "@backend/utils/response";
import { and, eq } from "drizzle-orm";

export default createRouter().delete(
	"/:id",
	async ({ params, db, status }) => {
		const { id } = params;

		const { rowCount } = await db
			.delete(users)
			.where(and(eq(users.id, id), eq(users.role, "admin")));
		if (!rowCount) {
			return status(404, failure({ message: "Admin not found" }));
		}

		await deleteCache("admin:pagination:*", `admin:${id}`);

		return success({ message: "Admin deleted" });
	},
	{
		private: ["admin"],
		params: RequestWithId,
		detail: {
			description: "Delete a admin"
		}
	}
);
