import { users } from "@backend/db/schema/auth";
import { createRouter } from "@backend/plugins/services";
import { failure } from "@backend/utils/response";
import { eq } from "drizzle-orm";
import { UpdateAdminRequest } from "./schema";

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

		return { message: "Admin updated" };
	},
	{
		private: ["admin"],
		body: UpdateAdminRequest,
		detail: {
			description: "Update a admin"
		}
	}
);
