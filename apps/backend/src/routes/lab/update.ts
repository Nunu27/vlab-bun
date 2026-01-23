import { labs } from "@backend/db/schema/lab";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { failure, success } from "@backend/utils/response";
import { RequestWithId } from "@shared/schemas/common";
import { LabRequest } from "@vlab/shared/schemas/rest";
import { and, eq } from "drizzle-orm";

export default createRouter().put(
	"/:id",
	async ({ params, body, session, db, status }) => {
		const { id } = params;

		const { rowCount } = await db
			.update(labs)
			.set(body)
			.where(and(eq(labs.id, id), eq(labs.authorId, session.data.id)));
		if (!rowCount) {
			return status(
				404,
				failure({
					message:
						"Lab not found or you don't have permission to update this lab"
				})
			);
		}

		await deleteCache("lab:pagination:*", `lab:${id}`);

		return success({ message: "Lab updated" });
	},
	{
		private: ["lecturer"],
		params: RequestWithId,
		body: LabRequest,
		detail: {
			description: "Update a lab"
		}
	}
);
