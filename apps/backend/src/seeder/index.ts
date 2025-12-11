import db from "@backend/db";
import logger from "@backend/services/logger";

import admin from "./admin";
import department from "./department";
import lecturer from "./lecturer";
import studyProgram from "./study-program";

try {
	logger.info("Seeding...");
	await db.transaction(async (tx) => {
		await admin.seed(tx);
		await lecturer.seed(tx);
		await department.seed(tx);
		await studyProgram.seed(tx);
	});
} catch (error) {
} finally {
	logger.info("Seeding complete");
	process.exit(0);
}
