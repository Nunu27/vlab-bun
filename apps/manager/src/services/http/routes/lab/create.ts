import { success } from "@jawit/common";
import db from "@manager/db";
import { labAttachments, labEmbeddedFiles, labs } from "@manager/db/schema/lab";
import auth from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { extractEmbeddedFiles } from "@manager/utils/file";
import { LabRequestSchema } from "@vlab/shared/schemas/lab";

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
						startAt: new Date(date.from),
						endAt: new Date(date.to),
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
				}

				const embeddedFiles = extractEmbeddedFiles(
					labData.content,
					labData.instructions,
				);
				if (embeddedFiles.length) {
					await tx.insert(labEmbeddedFiles).values(
						embeddedFiles.map((file) => ({
							labId: id,
							file,
						})),
					);
				}

				return id;
			});
			await cache.delete(`${key}:pagination:*`);

			return success({ message: `${label} created`, data: { id } });
		},
		{
			private: ["instructor"],
			body: LabRequestSchema,
		},
	);
