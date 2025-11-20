import { fileDependencies, files } from "@backend/db/schema/file";
import { createRouter } from "@backend/plugins/services";
import { failure, success } from "@backend/utils/response";
import { and, eq } from "drizzle-orm";
import { DeleteFileRequest } from "./schema";

export default createRouter().delete(
	"/:name",
	async ({ params, query, db, status }) => {
		const rowCount = await db.transaction(async (tx) => {
			const { rowCount } = await tx
				.delete(fileDependencies)
				.where(
					and(
						eq(fileDependencies.file, params.name),
						eq(fileDependencies.name, query.from)
					)
				);
			if (!rowCount) return rowCount;

			const count = await tx.$count(
				fileDependencies,
				eq(fileDependencies.file, params.name)
			);

			if (!count) {
				await tx
					.update(files)
					.set({ unused: true })
					.where(eq(files.name, params.name));
			}

			return rowCount;
		});

		if (!rowCount) {
			return status(404, failure({ message: "File not found" }));
		}

		return success({
			message: "File deleted successfully"
		});
	},
	{
		private: ["admin"],
		query: DeleteFileRequest,
		detail: {
			description: "Delete a file"
		}
	}
);
