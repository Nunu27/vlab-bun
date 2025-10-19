import { departments } from "@/db/schema/auth";
import { AppWithServices } from "@/plugins/services";
import { success } from "@/utils/response";
import { t } from "elysia";

const CreateDepartmentRequest = t.Object({
	name: t.String()
});

export default (app: AppWithServices) =>
	app.post(
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
