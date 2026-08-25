import { responses } from "@jawit/common";
import db from "@manager/db";
import { labAttachments, labEmbeddedFiles, labs } from "@manager/db/schema/lab";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";
import { extractEmbeddedFiles } from "@manager/utils/file";
import { Type as t } from "@sinclair/typebox";
import { NonEmptyString, RequestWithId } from "@vlab/shared/schemas/common";

export default createRouter()
	.use(auth)
	.post(
		"/:labId/duplicate",
		async ({
			params: { labId },
			body: { name },
			session: {
				data: { id: userId },
			},
			status,
			ENTITY: { LABEL: label },
		}) => {
			const source = await db.query.labs.findFirst({
				where: (labs, { eq, and }) =>
					and(eq(labs.id, labId), eq(labs.instructorId, userId)),
				with: {
					attachments: {
						columns: { name: true, file: true },
					},
				},
			});

			if (!source) return status(404, responses.notFound(label));

			const {
				id: _id,
				createdAt: _createdAt,
				updatedAt: _updatedAt,
				attachments,
				...labData
			} = source;

			const id = await db.transaction(async (tx) => {
				const [{ id }] = await tx
					.insert(labs)
					.values({
						...labData,
						name,
						isPublished: false,
					})
					.returning({ id: labs.id });

				if (attachments.length) {
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

			return responses.created(label, { id });
		},
		{
			private: ["instructor"],
			params: RequestWithId(["labId"]),
			body: t.Object({ name: NonEmptyString() }),
		},
	);
