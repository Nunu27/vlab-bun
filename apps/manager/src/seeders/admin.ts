import { users } from "@manager/db/schema/auth";
import type { Transaction } from "@manager/types/db";
import { getAffectedCount } from "@manager/utils/db";
import type { Logger } from "pino";

export default {
	seed: async (tx: Transaction, logger: Logger) => {
		logger.info("Seeding admin user...");

		const rowCount = await getAffectedCount(
			tx
				.insert(users)
				.values({
					name: "Admin",
					email: "admin@vlab.pens.ac.id",
					passwordHash: await Bun.password.hash("admin123"),
					role: "admin",
				})
				.onConflictDoNothing()
				.$dynamic(),
		);

		logger.info(`Seeded ${rowCount} admin user(s)`);
	},
};
