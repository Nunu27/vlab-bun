import { users } from "@/db/schema/auth";
import { AppWithServices } from "@/plugins/services";
import { failure } from "@/utils/response";
import { eq } from "drizzle-orm";
import { t } from "elysia";

const UpdateAdminRequest = t.Object({
	name: t.String(),
	email: t.String({ format: "email" })
});

export default (app: AppWithServices) =>
	app.put(
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
