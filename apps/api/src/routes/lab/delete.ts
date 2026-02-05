import db from "@api/db";
import { files } from "@api/db/schema/file";
import { labs } from "@api/db/schema/lab";
import auth from "@api/middlewares/auth";
import { cache } from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import { failure, success } from "@jawit/common";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { and, eq, inArray, sql } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.delete(
		"/:labId",
		async ({
			params: { labId: id },
			session,
			status,
			entity: { label, key },
		}) => {
			const deleted = await db.transaction(async (tx) => {
				const attachments = await tx.query.labAttachments.findMany({
					columns: { file: true },
					where: (la, { eq }) => eq(la.labId, id),
				});

				const { rowCount } = await tx
					.delete(labs)
					.where(and(eq(labs.id, id), eq(labs.instructorId, session.data.id)));

				if (!rowCount) return false;
				if (!attachments.length) return true;

				await tx
					.update(files)
					.set({ usedBy: sql`${files.usedBy} - 1` })
					.where(
						inArray(
							files.name,
							attachments.map(({ file }) => file),
						),
					);

				return true;
			});

			if (deleted) {
				await cache.delete(
					`${key}:pagination:*`,
					`${key}:${id}:*`,
					`${key}:${id}`,
				);

				return success({ message: `${label} deleted` });
			} else return status(404, failure({ message: `${label} not found` }));
		},
		{
			private: ["instructor"],
			params: RequestWithId(["labId"]),
		},
	);
