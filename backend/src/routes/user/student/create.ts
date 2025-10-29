import { degreeLevelEnum, students, users } from "@backend/db/schema/auth";
import { createAppWithServices } from "@backend/plugins/services";
import { success } from "@backend/utils/response";
import { t } from "elysia";

const CreateStudentRequest = t.Object({
	name: t.String(),
	email: t.String({ format: "email" }),
	nrp: t.String({ minLength: 10, maxLength: 10, format: "numeric" }),
	year: t.Integer({ min: 0 }),
	degreeLevel: t.UnionEnum(degreeLevelEnum.enumValues),
	studyProgramId: t.String({ format: "uuid" }),
	password: t.String({
		minLength: 8,
		maxLength: 128
	})
});

export default createAppWithServices().post(
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
