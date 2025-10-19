import db from "@/db";
import logger from "@/services/logger";

import admin from "./admin";
import department from "./department";
import studyProgram from "./study-program";

try {
	logger.info("Seeding...");
	await db.transaction(async (tx) => {
		await admin.seed(tx);
		await department.seed(tx);
		await studyProgram.seed(tx);
	});
} catch (error) {
} finally {
	logger.info("Seeding complete");
	process.exit(0);
}
