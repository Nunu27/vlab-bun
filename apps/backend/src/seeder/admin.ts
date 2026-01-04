import { users } from "@backend/db/schema/auth";
import type { Transaction } from "@backend/types";
import type { Logger } from "pino";

export default {
	seed: async (tx: Transaction, logger: Logger) => {
		logger.info("Seeding admin user...");

		const { rowCount } = await tx
			.insert(users)
			.values({
				name: "Admin",
				email: "admin@vlab.pens.ac.id",
				passwordHash: await Bun.password.hash("admin123"),
				role: "admin"
			})
			.onConflictDoNothing();

		logger.info(`Seeded ${rowCount} admin user(s)`);
	}
};
