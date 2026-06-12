import { departments } from "@manager/db/schema/auth";
import type { Transaction } from "@manager/types/db";
import { getAffectedCount } from "@manager/utils/db";
import type { Logger } from "pino";

export default {
	seed: async (tx: Transaction, logger: Logger) => {
		logger.info("Seeding departements...");

		const rowCount = await getAffectedCount(
			tx
				.insert(departments)
				.values([
					{
						name: "Teknik Elektro",
					},
					{
						name: "Teknik Informatika dan Komputer",
					},
					{
						name: "Teknik Mekanika dan Energi",
					},
					{
						name: "Teknologi Multimedia Kreatif",
					},
				])
				.onConflictDoNothing()
				.$dynamic(),
		);

		logger.info(`Seeded ${rowCount} departement(s)`);
	},
};
