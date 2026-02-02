import env from "@api/env";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./src/db",
	out: "./migrations",
	dialect: "postgresql",
	casing: "snake_case",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
});
