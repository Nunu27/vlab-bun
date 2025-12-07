import { lecturers, users } from "@backend/db/schema/auth";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { success } from "@backend/utils/response";
import { CreateLecturerRequest } from "@vlab/shared/schemas";

export default createRouter().post(
	"/",
	async ({ body, db }) => {
		const userId = await db.transaction(async (tx) => {
			const [user] = await tx
				.insert(users)
				.values({
					...body,
					role: "lecturer",
					passwordHash: await Bun.password.hash(body.password)
				})
				.returning({ id: users.id });

			await tx.insert(lecturers).values({
				...user,
				...body
			});

			return user.id;
		});
		await deleteCache("lecturer:pagination:*");

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
