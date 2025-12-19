import { lecturers, users } from "@backend/db/schema/auth";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { failure } from "@backend/utils/response";
import { RequestWithId, UpdateLecturerRequest } from "@vlab/shared/schemas";
import { eq } from "drizzle-orm";

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

			const { rowCount: lecturerCount } = await tx
				.update(lecturers)
				.set(body)
				.where(eq(lecturers.id, id));

			return lecturerCount;
		});
		if (!rowCount) {
			return status(404, failure({ message: "Lecturer not found" }));
		}

		await deleteCache("lecturer:pagination:*", `lecturer:${id}`);

		return { message: "Lecturer updated" };
	},
	{
		private: ["admin"],
		params: RequestWithId,
		body: UpdateLecturerRequest,
		detail: {
			description: "Update a lecturer"
		}
	}
);
