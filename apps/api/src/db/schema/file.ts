import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { base } from "./base";

export const files = pgTable("file", {
	...base,
	name: text().unique().notNull(),
	usedBy: integer().default(0).notNull(),
});
