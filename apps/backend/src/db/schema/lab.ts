import { jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { base } from "./base";
import { lecturers } from "./auth";
import { labSessions } from "./lab-session";
import { relations } from "drizzle-orm/relations";
import type { LabTopology } from "@vlab/shared/schemas";

export const labs = pgTable("lab", {
	...base,
	name: text().notNull(),
	topology: jsonb().$type<LabTopology>().notNull(),
	authorId: uuid()
		.references(() => lecturers.id, { onDelete: "cascade" })
		.notNull()
});

export const labsRelations = relations(labs, ({ many, one }) => ({
	sessions: many(labSessions),
	author: one(lecturers, {
		fields: [labs.authorId],
		references: [lecturers.id]
	})
}));
