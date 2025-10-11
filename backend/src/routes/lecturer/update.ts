import { lecturers, users } from "@/db/schema";
import { AppWithServices } from "@/services";
import { eq } from "drizzle-orm";
import { t } from "elysia";

const UpdateLecturerRequest = t.Object({
	name: t.String(),
	email: t.String({ format: "email" }),
	nip: t.String({ minLength: 1, maxLength: 100, format: "numeric" })
});

export default (app: AppWithServices) =>
	app.put(
		"/:id",
		async ({ params, body, db }) => {
			const { id } = params;

			await db.transaction(async (tx) => {
				await tx.update(users).set(body).where(eq(users.id, id));
				await tx.update(lecturers).set(body).where(eq(lecturers.id, id));
			});

			return { message: "Lecturer updated" };
		},
		{
			private: ["admin"],
			body: UpdateLecturerRequest,
			detail: {
				description: "Update a lecturer"
			}
		}
	);
