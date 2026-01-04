import db from "@backend/db";
import { childLogger } from "@backend/services/logger";

import admin from "./admin";
import department from "./department";
import lecturer from "./lecturer";
import studyProgram from "./study-program";

const logger = childLogger("seeder");
const seeder = [admin, lecturer, department, studyProgram];

try {
	logger.info("Seeding...");
	await db.transaction(async (tx) => {
		for (const { seed } of seeder) {
			await seed(tx, logger);
		}
	});
} catch (error) {
	logger.error({ error }, "Seeding failed");
} finally {
	logger.info("Seeding complete");
	process.exit(0);
}
