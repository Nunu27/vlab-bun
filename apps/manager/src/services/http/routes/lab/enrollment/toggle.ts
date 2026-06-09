import { success } from "@jawit/common";
import db from "@manager/db";
import { labEnrollments } from "@manager/db/schema/lab";
import auth from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
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
