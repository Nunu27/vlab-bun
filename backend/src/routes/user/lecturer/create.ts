import { lecturers, users } from "@/db/schema";
import { AppWithServices } from "@/plugins/services";
import { success } from "@/utils/response";
import { t } from "elysia";

const CreateLecturerRequest = t.Object({
	name: t.String(),
	email: t.String({ format: "email" }),
	nip: t.String({ minLength: 1, maxLength: 100, format: "numeric" }),
	password: t.String({
		minLength: 8,
		maxLength: 128
	})
});

export default (app: AppWithServices) =>
	app.post(
		"/",
		async ({ body, db }) => {
			const userId = await db.transaction(async (tx) => {
				const [user] = await tx
					.insert(users)
					.values({
						...body,
						passwordHash: await Bun.password.hash(body.password)
					})
					.returning({ id: users.id });

				await tx.insert(lecturers).values({
					...user,
					...body
				});

				return user.id;
			});

			return success({ message: "Lecturer created", data: { id: userId } });
		},
		{
			private: ["admin"],
			body: CreateLecturerRequest,
			detail: {
				description: "Create a new lecturer"
			}
		}
	);
