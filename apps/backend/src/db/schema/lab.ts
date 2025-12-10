import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { base } from "./base";
import { lecturers } from "./auth";

export const labs = pgTable("lab", {
	...base,
	name: text().notNull(),
	authorId: uuid()
		.references(() => lecturers.id, { onDelete: "cascade" })
		.notNull()
});
