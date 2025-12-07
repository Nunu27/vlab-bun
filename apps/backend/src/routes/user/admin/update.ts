import { users } from "@backend/db/schema/auth";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { RequestWithId } from "@backend/routes/schema";
import { failure } from "@backend/utils/response";
import { eq } from "drizzle-orm";
import { UpdateAdminRequest } from "@vlab/shared/schemas";

export default createRouter().put(
	"/:id",
	async ({ params, body, db, status }) => {
		const { id } = params;

		const { rowCount } = await db
			.update(users)
			.set(body)
			.where(eq(users.id, id));
		if (rowCount === 0) {
			return status(404, failure({ message: "Admin not found" }));
		}

		await deleteCache("admin:pagination:*", `admin:${id}`);

		return { message: "Admin updated" };
	},
	{
		private: ["admin"],
		params: RequestWithId,
		body: UpdateAdminRequest,
		detail: {
			description: "Update a admin"
		}
	}
);
