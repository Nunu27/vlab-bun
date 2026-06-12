import { failure, success } from "@jawit/common";
import db from "@manager/db";
import { files } from "@manager/db/schema";
import { labAttachments, labs } from "@manager/db/schema/lab";
import auth from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { getAffectedCount } from "@manager/utils/db";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { LabRequestSchema } from "@vlab/shared/schemas/lab";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { storageCleanUpJob } from "../file/cron";

export default createRouter()
	.use(auth)
	.put(
		"/:labId",
		async ({
			params: { labId: id },
			body,
			session: {
				data: { id: userId },
			},
			status,
			entity: { label, key },
		}) => {
			const { attachments, date, ...labData } = body;

			const updated = await db.transaction(async (tx) => {
				const rowCount = await getAffectedCount(
					tx
						.update(labs)
						.set({ ...labData, startAt: date.from, endAt: date.to })
						.where(and(eq(labs.id, id), eq(labs.instructorId, userId)))
						.$dynamic(),
				);
				if (!rowCount) return false;

				const attachmentFiles = attachments.map(({ file }) => file);
				const attachmentFilter = eq(labAttachments.labId, id);
				const deletedFiles = await tx
					.delete(labAttachments)
					.where(
						attachments.length
							? and(
									attachmentFilter,
									notInArray(labAttachments.file, attachmentFiles),
								)
							: attachmentFilter,
					)
					.returning({ file: labAttachments.file });

				if (deletedFiles.length) {
					await tx
						.update(files)
						.set({ usedBy: sql`${files.usedBy} - 1` })
						.where(
							inArray(
								files.name,
								deletedFiles.map(({ file }) => file),
							),
						);
				}

				if (attachments.length) {
					const inserted = await tx
						.insert(labAttachments)
						.values(
							attachments.map((attachment) => ({
								...attachment,
								labId: id,
							})),
						)
						.onConflictDoNothing()
						.returning({ file: labAttachments.file });

					if (inserted.length) {
						await tx
							.update(files)
							.set({ usedBy: sql`${files.usedBy} + 1` })
							.where(
								inArray(
									files.name,
									inserted.map(({ file }) => file),
								),
							);
					}
				}

				return true;
			});

			if (updated) {
				storageCleanUpJob.resume();
				await cache.delete(`${key}:pagination:*`, `${key}:${id}`);

				return success({ message: `${label} updated` });
			} else return status(404, failure({ message: `${label} not found` }));
		},
		{
			private: ["instructor"],
			params: RequestWithId(["labId"]),
			body: LabRequestSchema,
		},
	);
