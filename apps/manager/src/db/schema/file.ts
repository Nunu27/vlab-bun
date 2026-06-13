import { pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { base } from "./base";

export const files = pgTable(
	"file",
	{
		...base,
		name: text().unique().notNull(),
	},
	(t) => [uniqueIndex().on(t.name)],
);
