import { success } from "@jawit/common";
import db from "@manager/db";
import { files } from "@manager/db/schema";
import { labAttachments, labs } from "@manager/db/schema/lab";
import auth from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { LabRequestSchema } from "@vlab/shared/schemas/lab";
import { inArray, sql } from "drizzle-orm";
import { storageCleanUpJob } from "../file/cron";

export default createRouter()
	.use(auth)
	.post(
		"/",
		async ({ body, session, entity: { label, key } }) => {
			const { attachments, date, ...labData } = body;

			const id = await db.transaction(async (tx) => {
				const [{ id }] = await tx
					.insert(labs)
					.values({
						...labData,
						startAt: date.from,
						endAt: date.to,
						instructorId: session.data.id,
					})
					.returning({ id: labs.id });

				if (attachments?.length) {
					await tx.insert(labAttachments).values(
						attachments.map((attachment) => ({
							...attachment,
							labId: id,
						})),
					);

					await tx
						.update(files)
						.set({ usedBy: sql`${files.usedBy} + 1` })
						.where(
							inArray(
								files.name,
								attachments.map(({ file }) => file),
							),
						);
				}

				return id;
			});
			storageCleanUpJob.resume();
			await cache.delete(`${key}:pagination:*`);

			return success({ message: `${label} created`, data: { id } });
		},
		{
			private: ["instructor"],
			body: LabRequestSchema,
		},
	);
