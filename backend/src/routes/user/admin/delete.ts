import { users } from "@/db/schema/auth";
import { AppWithServices } from "@/plugins/services";
import { failure, success } from "@/utils/response";
import { and, eq } from "drizzle-orm";

export default (app: AppWithServices) =>
	app.delete(
		"/:id",
		async ({ params, db, status }) => {
			const { id } = params;

			const { rowCount } = await db
				.delete(users)
				.where(and(eq(users.id, id), eq(users.role, "admin")));
			if (rowCount === 0) {
				return status(404, failure({ message: "Admin not found" }));
			}

			return success({ message: "Admin deleted" });
		},
		{
			private: ["admin"],
			detail: {
				description: "Delete a admin"
			}
		}
	);
