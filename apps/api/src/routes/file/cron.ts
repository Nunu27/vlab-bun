import db from "@api/db";
import { files } from "@api/db/schema/file";
import baseLogger from "@api/services/logger";
import storage from "@api/services/storage";
import { Cron } from "croner";
import { inArray } from "drizzle-orm";

const logger = baseLogger.child({ service: "storage" });

export const storageCleanUpJob = new Cron(
	"*/15 * * * *",
	{
		catch: (error) => logger.error({ error }),
	},
	async (cron) => {
		await db.transaction(async (tx) => {
			const filesToDelete = await tx.query.files.findMany({
				columns: { name: true },
				where: (files, { eq }) => eq(files.usedBy, 0),
			});

			const names = filesToDelete.map((f) => f.name);
			if (!names.length) return;

			logger.info("Found %d unused files, deleting...", names.length);
			const statuses = await storage.deleteObjects(names);
			const deleted = names.filter((_, i) => statuses[i]);

			if (deleted.length) {
				await tx.delete(files).where(inArray(files.name, deleted));
				logger.info(
					"Deleted %d files from storage and database",
					deleted.length,
				);
			} else {
				logger.info("No files were deleted from storage");
			}
		});

		cron.pause();
	},
);
