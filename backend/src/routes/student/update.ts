import { degreeLevelEnum, students, users } from "@/db/schema";
import { AppWithServices } from "@/plugins/services";
import { eq } from "drizzle-orm";
import { t } from "elysia";

const UpdateStudentRequest = t.Object({
	name: t.String(),
	email: t.String({ format: "email" }),
	nrp: t.String({ minLength: 10, maxLength: 10, format: "numeric" }),
	year: t.Integer({ min: 0 }),
	degreeLevel: t.UnionEnum(degreeLevelEnum.enumValues),
	studyProgramId: t.String({ format: "uuid" })
});

export default (app: AppWithServices) =>
	app.put(
		"/:id",
		async ({ params, body, db }) => {
			const { id } = params;

			await db.transaction(async (tx) => {
				await tx.update(users).set(body).where(eq(users.id, id));
				await tx.update(students).set(body).where(eq(students.id, id));
			});

			return { message: "Student updated" };
		},
		{
			private: ["admin"],
			body: UpdateStudentRequest,
			detail: {
				description: "Update a student"
			}
		}
	);
