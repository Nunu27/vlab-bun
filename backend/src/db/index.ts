import env from "@backend/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { isProduction } from "elysia/error";
import * as schema from "./schema";

export default drizzle({
	schema,
	logger: !isProduction,
	casing: "snake_case",
	connection: env.DATABASE_URL
});
