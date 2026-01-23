import { departments } from "@backend/db/schema/auth";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { success } from "@backend/utils/response";
import { CreateDepartmentRequest } from "@vlab/shared/schemas/rest";

export default createRouter().post(
	"/",
	async ({ body, db }) => {
		const [{ id }] = await db
			.insert(departments)
			.values(body)
			.returning({ id: departments.id });
		await deleteCache("department:pagination:*");

		return success({
			message: "Department created",
			data: { id }
		});
	},
	{
		private: ["admin"],
		body: CreateDepartmentRequest,
		detail: {
			description: "Create a new department"
		}
	}
);
