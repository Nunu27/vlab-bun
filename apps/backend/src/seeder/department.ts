import { departments } from "@backend/db/schema/auth";
import logger from "@backend/services/logger";
import type { Transaction } from "@backend/types";

export default {
	seed: async (tx: Transaction) => {
		logger.info("Seeding departements...");

		const { rowCount } = await tx
			.insert(departments)
			.values([
				{
					name: "Teknik Elektro"
				},
				{
					name: "Teknik Informatika dan Komputer"
				},
				{
					name: "Teknik Mekanika dan Energi"
				},
				{
					name: "Teknologi Multimedia Kreatif"
				}
			])
			.onConflictDoNothing();

		logger.info(`Seeded ${rowCount} departement(s)`);
	}
};
