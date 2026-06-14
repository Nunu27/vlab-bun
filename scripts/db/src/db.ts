import * as schema from "@schema";
import { drizzle } from "drizzle-orm/bun-sql";

export function getDB(uri: string) {
	return drizzle({
		schema,
		casing: "snake_case",
		connection: uri,
	});
}
