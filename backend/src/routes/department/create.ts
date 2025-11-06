import { departments } from "@backend/db/schema/auth";
import { createRouter } from "@backend/plugins/services";
import { success } from "@backend/utils/response";
import { CreateDepartmentRequest } from "./schema";

export default createRouter().post(
	"/",
	async ({ body, db }) => {
		const [department] = await db
			.insert(departments)
			.values(body)
			.returning({ id: departments.id });

		return success({
			message: "Department created",
			data: { id: department.id }
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
