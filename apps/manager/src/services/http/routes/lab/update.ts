import { failure, success } from "@jawit/common";
import db from "@manager/db";
import { labAttachments, labEmbeddedFiles, labs } from "@manager/db/schema/lab";
import auth from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { getAffectedCount } from "@manager/utils/db";
import { extractEmbeddedFiles } from "@manager/utils/file";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { LabRequestSchema } from "@vlab/shared/schemas/lab";
import { and, eq, notInArray } from "drizzle-orm";

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
						.set({
							...labData,
							cover: labData.cover ?? null,
							maxAttempt: labData.maxAttempt ?? null,
							startAt: new Date(date.from),
							endAt: new Date(date.to),
						})
						.where(and(eq(labs.id, id), eq(labs.instructorId, userId)))
						.$dynamic(),
				);
				if (!rowCount) return false;

				const attachmentFiles = attachments.map(({ file }) => file);
				const attachmentFilter = eq(labAttachments.labId, id);
				await tx
					.delete(labAttachments)
					.where(
						attachments.length
							? and(
									attachmentFilter,
									notInArray(labAttachments.file, attachmentFiles),
								)
							: attachmentFilter,
					);

				if (attachments.length) {
					await tx
						.insert(labAttachments)
						.values(
							attachments.map((attachment) => ({
								...attachment,
								labId: id,
							})),
						)
						.onConflictDoNothing();
				}

				const embeddedFiles = extractEmbeddedFiles(
					labData.content,
					labData.instructions,
				);

				await tx
					.delete(labEmbeddedFiles)
					.where(
						embeddedFiles.length
							? and(
									eq(labEmbeddedFiles.labId, id),
									notInArray(labEmbeddedFiles.file, embeddedFiles),
								)
							: eq(labEmbeddedFiles.labId, id),
					);

				if (embeddedFiles.length) {
					await tx
						.insert(labEmbeddedFiles)
						.values(
							embeddedFiles.map((file) => ({
								labId: id,
								file,
							})),
						)
						.onConflictDoNothing();
				}

				return true;
			});

			if (updated) {
				await cache.delete(`${key}:${id}`, `${key}:${id}:*`);

				return success({ message: `${label} updated` });
			} else return status(404, failure({ message: `${label} not found` }));
		},
		{
			private: ["instructor"],
			params: RequestWithId(["labId"]),
			body: LabRequestSchema,
		},
	);
