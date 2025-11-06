import { departments } from "@backend/db/schema/auth";
import { createRouter } from "@backend/plugins/services";
import { eq } from "drizzle-orm";
import { UpdateDepartmentRequest } from "./schema";

export default createRouter().put(
	"/:id",
	async ({ params, body, db }) => {
		const { id } = params;

		await db.update(departments).set(body).where(eq(departments.id, id));

		return { message: "Department updated" };
	},
	{
		private: ["admin"],
		body: UpdateDepartmentRequest,
		detail: {
			description: "Update a department"
		}
	}
);
