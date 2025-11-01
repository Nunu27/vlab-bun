import { departments } from "@backend/db/schema/auth";
import { createAppWithServices } from "@backend/plugins/services";
import { success } from "@backend/utils/response";
import { CreateDepartmentRequest } from "./schema";

export default createAppWithServices().post(
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
