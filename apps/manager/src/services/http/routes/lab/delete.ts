import { failure, success } from "@jawit/common";
import db from "@manager/db";
import { files } from "@manager/db/schema/file";
import { labs } from "@manager/db/schema/lab";
import auth from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { getAffectedCount } from "@manager/utils/db";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import { storageCleanUpJob } from "../file/cron";

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

				const rowCount = await getAffectedCount(
					tx
						.delete(labs)
						.where(and(eq(labs.id, id), eq(labs.instructorId, session.data.id)))
						.$dynamic(),
				);

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
				storageCleanUpJob.resume();
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
