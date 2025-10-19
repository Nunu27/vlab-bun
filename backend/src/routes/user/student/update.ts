import { degreeLevelEnum, students, users } from "@/db/schema/auth";
import { AppWithServices } from "@/plugins/services";
import { failure } from "@/utils/response";
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
		async ({ params, body, db, status }) => {
			const { id } = params;

			const rowCount = await db.transaction(async (tx) => {
				const { rowCount: userCount } = await tx
					.update(users)
					.set(body)
					.where(eq(users.id, id));
				if (userCount === 0) return userCount;

				const { rowCount: studentCount } = await tx
					.update(students)
					.set(body)
					.where(eq(students.id, id));
				return studentCount;
			});
			if (rowCount === 0) {
				return status(404, failure({ message: "Student not found" }));
			}

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
