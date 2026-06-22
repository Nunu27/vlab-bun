import env, { inProduction } from "@manager/env";
import baseLogger from "@manager/lib/logger";
import { drizzle } from "drizzle-orm/bun-sql";
import { migrate } from "drizzle-orm/bun-sql/migrator";

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
	connection: {
		url: env.DATABASE_URL,
		idleTimeout: 900,
		connectionTimeout: 30,
	},
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
