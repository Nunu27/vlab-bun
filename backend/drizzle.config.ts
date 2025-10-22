import { defineConfig } from "drizzle-kit";
import env from "./src/env";

export default defineConfig({
	out: "./migrations",
	schema: "./src/db/schema",
	dialect: "postgresql",
	casing: "snake_case",
	dbCredentials: {
		url: env.DATABASE_URL
	}
});
