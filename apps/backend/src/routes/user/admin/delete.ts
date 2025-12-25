import { users } from "@backend/db/schema/auth";
import { deleteCache } from "@backend/middlewares/caching";
import { deleteSession } from "@backend/middlewares/session";
import { createRouter } from "@backend/plugins/services";
import { failure, success } from "@backend/utils/response";
import { RequestWithId } from "@vlab/shared/schemas";
import { and, eq } from "drizzle-orm";

export default createRouter().delete(
	"/:id",
	async ({ session, params, db, status }) => {
		const { id } = params;

		if (id === session.data.id) {
			return status(400, failure({ message: "You cannot delete yourself" }));
		}

		const { rowCount } = await db
			.delete(users)
			.where(and(eq(users.id, id), eq(users.role, "admin")));
		if (!rowCount) {
			return status(404, failure({ message: "Admin not found" }));
		}

		await deleteCache("admin:pagination:*", `admin:${id}`, `me:${id}`);
		await deleteSession(id);

		return success({ message: "Admin deleted" });
	},
	{
		private: ["admin"],
		params: RequestWithId,
		detail: {
			description: "Delete an admin"
		}
	}
);
