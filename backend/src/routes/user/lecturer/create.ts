import { lecturers, users } from "@backend/db/schema/auth";
import { createAppWithServices } from "@backend/plugins/services";
import { success } from "@backend/utils/response";
import { CreateLecturerRequest } from "./schema";

export default createAppWithServices().post(
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
