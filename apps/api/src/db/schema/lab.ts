import type { LabInstruction, LabTopology } from "@vlab/shared/schemas/lab";
import {
	boolean,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";
import { instructors, students } from "./auth";
import { base } from "./base";
import { labSessions } from "./lab-session";

export const labs = pgTable("lab", {
	...base,
	name: text().notNull(),
	cover: text(),
	content: text().notNull(),
	maxAttempt: integer(),
	topology: jsonb().$type<LabTopology>().notNull(),
	instructions: jsonb().$type<LabInstruction[]>().notNull(),
	instructorId: uuid()
		.references(() => instructors.id, { onDelete: "restrict" })
		.notNull(),
	startAt: timestamp({ withTimezone: true }).notNull(),
	endAt: timestamp({ withTimezone: true }).notNull(),
	isPublished: boolean().default(false).notNull(),
});

export const labsRelations = relations(labs, ({ one, many }) => ({
	instructor: one(instructors, {
		fields: [labs.instructorId],
		references: [instructors.id],
	}),
	attachments: many(labAttachments),
	enrollments: many(labEnrollments),
	sessions: many(labSessions),
}));

export const labAttachments = pgTable("lab_attachments", {
	...base,
	name: text().notNull(),
	file: text().notNull(),
	labId: uuid()
		.references(() => labs.id, { onDelete: "cascade" })
		.notNull(),
});

export const labAttachmentsRelations = relations(labAttachments, ({ one }) => ({
	lab: one(labs, {
		fields: [labAttachments.labId],
		references: [labs.id],
	}),
}));

export const labEnrollments = pgTable(
	"lab_enrollment",
	{
		labId: uuid()
			.references(() => labs.id, { onDelete: "cascade" })
			.notNull(),
		studentId: uuid()
			.references(() => students.id, { onDelete: "cascade" })
			.notNull(),
		createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
	},
	(t) => [primaryKey({ columns: [t.labId, t.studentId] })],
);

export const labEnrollmentsRelations = relations(labEnrollments, ({ one }) => ({
	lab: one(labs, {
		fields: [labEnrollments.labId],
		references: [labs.id],
	}),
	student: one(students, {
		fields: [labEnrollments.studentId],
		references: [students.id],
	}),
}));
