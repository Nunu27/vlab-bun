import { departments } from "@/db/schema/auth";
import { AppWithServices } from "@/plugins/services";
import { eq } from "drizzle-orm";
import { t } from "elysia";

const UpdateDepartmentRequest = t.Object({
	name: t.String()
});

export default (app: AppWithServices) =>
	app.put(
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
