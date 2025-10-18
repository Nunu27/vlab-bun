import { users } from "@/db/schema";
import { AppWithServices } from "@/plugins/services";
import { success } from "@/utils/response";
import { eq } from "drizzle-orm";

export default (app: AppWithServices) =>
	app.delete(
		"/:id",
		async ({ params, db }) => {
			const { id } = params;

			await db.delete(users).where(eq(users.id, id));

			return success({ message: "Lecturer deleted" });
		},
		{
			private: ["admin"],
			detail: {
				description: "Delete a lecturer"
			}
		}
	);
