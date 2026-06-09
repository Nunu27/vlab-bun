import { instructors, users } from "@manager/db/schema/auth";
import type { Transaction } from "@manager/types/db";
import type { Logger } from "pino";

export default {
	seed: async (tx: Transaction, logger: Logger) => {
		logger.info("Seeding instructor user...");

		const insertedUsers = await tx
			.insert(users)
			.values({
				name: "Instructor",
				email: "instructor@vlab.pens.ac.id",
				passwordHash: await Bun.password.hash("instructor123"),
				role: "instructor",
			})
			.onConflictDoNothing()
			.returning({ id: users.id, email: users.email });

		if (insertedUsers.length === 0) {
			logger.info("Instructor user already exists");
			return;
		}

		const instructorData = {
			"instructor@vlab.pens.ac.id": {
				nip: "1987654321",
			},
		};

		const { rowCount } = await tx
			.insert(instructors)
			.values(
				insertedUsers.map((user) => ({
					...user,
					...instructorData[user.email as keyof typeof instructorData],
				})),
			)
			.onConflictDoNothing();

		logger.info(`Seeded ${rowCount} instructor user(s)`);
	},
};
