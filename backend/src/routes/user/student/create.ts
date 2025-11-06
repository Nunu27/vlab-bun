import { students, users } from "@backend/db/schema/auth";
import { createRouter } from "@backend/plugins/services";
import { success } from "@backend/utils/response";
import { CreateStudentRequest } from "./schema";

export default createRouter().plugin.post(
	"/",
	async ({ body, db }) => {
		const userId = await db.transaction(async (tx) => {
			const [user] = await tx
				.insert(users)
				.values({
					email: body.email,
					name: body.name,
					passwordHash: await Bun.password.hash(body.password)
				})
				.returning({ id: users.id });

			await tx.insert(students).values({
				id: user.id,
				nrp: body.nrp,
				year: body.year,
				degreeLevel: body.degreeLevel,
				studyProgramId: body.studyProgramId
			});

			return user.id;
		});

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
