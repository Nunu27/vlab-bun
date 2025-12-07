import { departments } from "@backend/db/schema/auth";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { eq } from "drizzle-orm";
import { RequestWithId } from "../schema";
import { UpdateDepartmentRequest } from "@vlab/shared/schemas";

export default createRouter().put(
	"/:id",
	async ({ params, body, db }) => {
		const { id } = params;

		await db.update(departments).set(body).where(eq(departments.id, id));
		await deleteCache("department:pagination:*", `department:${id}`);

		return { message: "Department updated" };
	},
	{
		private: ["admin"],
		params: RequestWithId,
		body: UpdateDepartmentRequest,
		detail: {
			description: "Update a department"
		}
	}
);
