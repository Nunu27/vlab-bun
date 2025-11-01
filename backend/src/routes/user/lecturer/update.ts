import { lecturers, users } from "@backend/db/schema/auth";
import { createAppWithServices } from "@backend/plugins/services";
import { failure } from "@backend/utils/response";
import { eq } from "drizzle-orm";
import { UpdateLecturerRequest } from "./schema";

export default createAppWithServices().put(
	"/:id",
	async ({ params, body, db, status }) => {
		const { id } = params;

		const rowCount = await db.transaction(async (tx) => {
			const { rowCount: userCount } = await tx
				.update(users)
				.set(body)
				.where(eq(users.id, id));
			if (userCount === 0) return userCount;

			const { rowCount: lecturerCount } = await tx
				.update(lecturers)
				.set(body)
				.where(eq(lecturers.id, id));
			return lecturerCount;
		});
		if (rowCount === 0) {
			return status(404, failure({ message: "Lecturer not found" }));
		}

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
