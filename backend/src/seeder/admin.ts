import { users } from "../db/schema";
import logger from "../services/logger";
import { Transaction } from "../types/seeder";

export default {
	seed: async (tx: Transaction) => {
		logger.info("Seeding admin user...");

		const { rowCount } = await tx.insert(users).values({
			name: "Wisnu",
			email: "wisnu@gmail.com",
			passwordHash: await Bun.password.hash("wisnu123"),
			role: "admin"
		});

		logger.info(`Seeded ${rowCount} admin user(s)`);
	}
};
