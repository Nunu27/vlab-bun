import { departments } from "@backend/db/schema/auth";
import { createRouter } from "@backend/plugins/services";
import { success } from "@backend/utils/response";
import { eq } from "drizzle-orm";

export default createRouter().delete(
	"/:id",
	async ({ params, db }) => {
		const { id } = params;

		await db.delete(departments).where(eq(departments.id, id));

		return success({ message: "Department deleted" });
	},
	{
		private: ["admin"],
		detail: {
			description: "Delete a department"
		}
	}
);
