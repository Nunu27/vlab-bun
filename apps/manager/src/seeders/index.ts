import db from "@manager/db";
import baseLogger from "@manager/lib/logger";

import admin from "./admin";
import department from "./department";
import lecturer from "./instructor";
import studyProgram from "./study-program";

const logger = baseLogger.child({ service: "seeder" });
const seeder = [admin, lecturer, department, studyProgram];

export async function runSeeder() {
	logger.info("Seeding...");
	try {
		await db.transaction(async (tx) => {
			for (const { seed } of seeder) {
				await seed(tx, logger);
			}
		});
		logger.info("Seeding complete");
	} catch (error) {
		logger.error({ error }, "Seeding failed");
		throw error;
	} finally {
		await db.$client.end();
	}
}
