import db from "@api/db";
import { labEnrollments } from "@api/db/schema/lab";
import auth from "@api/middlewares/auth";
import { cache } from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import { success } from "@jawit/common";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { and, eq } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.guard(
		{
			private: ["student"],
			params: RequestWithId(["labId"]),
		},
		(app) => {
			return app
				.post("/", async ({ params: { labId }, session, entity: { key } }) => {
					await db
						.insert(labEnrollments)
						.values({
							labId,
							studentId: session.data.id,
						})
						.onConflictDoNothing();

					await cache.delete(
						`${key}:pagination:*`,
						`${key}:${labId}:*`,
						`${key}:${labId}`,
					);

					return success({ message: "Successfully enrolled" });
				})
				.delete(
					"/",
					async ({ params: { labId }, session, entity: { key } }) => {
						await db
							.delete(labEnrollments)
							.where(
								and(
									eq(labEnrollments.labId, labId),
									eq(labEnrollments.studentId, session.data.id),
								),
							);

						await cache.delete(
							`${key}:pagination:*`,
							`${key}:${labId}:*`,
							`${key}:${labId}`,
						);

						return success({ message: "Successfully unenrolled" });
					},
				);
		},
	);
