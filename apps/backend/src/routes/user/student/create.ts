import { students, users } from "@backend/db/schema/auth";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { success } from "@backend/utils/response";
import { CreateStudentRequest } from "@vlab/shared/schemas/rest";

export default createRouter().post(
	"/",
	async ({ body, db }) => {
		const userId = await db.transaction(async (tx) => {
			const [{ id }] = await tx
				.insert(users)
				.values({
					email: body.email,
					name: body.name,
					passwordHash: await Bun.password.hash(body.password)
				})
				.returning({ id: users.id });

			await tx.insert(students).values({
				id,
				...body
			});

			return id;
		});
		await deleteCache("student:pagination:*");

		return success({ message: "Student created", data: { id: userId } });
	},
	{
		private: ["admin"],
		body: CreateStudentRequest,
		detail: {
			description: "Create a new student"
		}
	}
);
