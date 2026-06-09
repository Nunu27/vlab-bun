import env, { inProduction } from "@manager/env";
import baseLogger from "@manager/lib/logger";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import * as schema from "./schema";

const logger = baseLogger.child({ service: "db" });

const db = drizzle({
	schema,
	casing: "snake_case",
	logger: inProduction
		? undefined
		: {
				logQuery: (query, params) => {
					logger.debug({ query, params }, "Executed query");
				},
			},
	connection: env.DATABASE_URL,
});

export default db;

export async function checkAndRunMigration() {
	try {
		logger.info("Checking and running migrations...");
		await migrate(db, {
			migrationsFolder: "./migrations",
		});
		logger.info("Migrations completed successfully.");
	} catch (error) {
		logger.error({ error }, "Migration failed");
		throw error;
	}
}
