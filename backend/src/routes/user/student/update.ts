import { students, users } from "@backend/db/schema/auth";
import { createRouter } from "@backend/plugins/services";
import { failure } from "@backend/utils/response";
import { eq } from "drizzle-orm";
import { UpdateStudentRequest } from "./schema";

export default createRouter().put(
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
