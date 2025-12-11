import { lecturers, users } from "@backend/db/schema/auth";
import logger from "@backend/services/logger";
import type { Transaction } from "@backend/types";

export default {
	seed: async (tx: Transaction) => {
		logger.info("Seeding lecturer user...");

		const insertedUsers = await tx
			.insert(users)
			.values({
				name: "Lecturer",
				email: "lecturer@vlab.pens.ac.id",
				passwordHash: await Bun.password.hash("lecturer123"),
				role: "lecturer"
			})
			.onConflictDoNothing()
			.returning({ id: users.id, email: users.email });

		const lecturerData = {
			"lecturer@vlab.pens.ac.id": {
				nip: "1987654321"
			}
		};

		const { rowCount } = await tx
			.insert(lecturers)
			.values(
				insertedUsers.map((user) => ({
					...user,
					...lecturerData[user.email as keyof typeof lecturerData]
				}))
			)
			.onConflictDoNothing();

		logger.info(`Seeded ${rowCount} lecturer user(s)`);
	}
};
