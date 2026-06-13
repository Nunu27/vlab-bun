import type { LabChecksMap, LabTopology } from "@vlab/shared/schemas/lab";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";
import { instructors, students } from "./auth";
import { base } from "./base";
import { labSessions } from "./lab-session";

export const labs = pgTable(
	"lab",
	{
		...base,
		name: text().notNull(),
		cover: text(),
		content: text().notNull(),
		maxAttempt: integer(),
		sessionDuration: integer().default(180).notNull(),
		topology: jsonb().$type<LabTopology>().notNull(),
		instructions: text().notNull(),
		checks: jsonb().$type<LabChecksMap>().notNull().default({}),
		instructorId: uuid()
			.references(() => instructors.id, { onDelete: "restrict" })
			.notNull(),
		startAt: timestamp({ withTimezone: true }).notNull(),
		endAt: timestamp({ withTimezone: true }).notNull(),
		isPublished: boolean().default(false).notNull(),
	},
	(t) => [index("lab_cover_idx").on(t.cover)],
);

export const labsRelations = relations(labs, ({ one, many }) => ({
	instructor: one(instructors, {
		fields: [labs.instructorId],
		references: [instructors.id],
	}),
	attachments: many(labAttachments),
	embeddedFiles: many(labEmbeddedFiles),
	enrollments: many(labEnrollments),
	sessions: many(labSessions),
}));

export const labAttachments = pgTable(
	"lab_attachments",
	{
		...base,
		name: text().notNull(),
		file: text().notNull(),
		labId: uuid()
			.references(() => labs.id, { onDelete: "cascade" })
			.notNull(),
	},
	(t) => [
		uniqueIndex().on(t.labId, t.file),
		index("lab_attachments_file_idx").on(t.file),
	],
);

export const labAttachmentsRelations = relations(labAttachments, ({ one }) => ({
	lab: one(labs, {
		fields: [labAttachments.labId],
		references: [labs.id],
	}),
}));

export const labEmbeddedFiles = pgTable(
	"lab_embedded_file",
	{
		labId: uuid()
			.references(() => labs.id, { onDelete: "cascade" })
			.notNull(),
		file: text().notNull(),
	},
	(t) => [
		primaryKey({ columns: [t.labId, t.file] }),
		index("lab_embedded_file_file_idx").on(t.file),
	],
);

export const labEmbeddedFilesRelations = relations(
	labEmbeddedFiles,
	({ one }) => ({
		lab: one(labs, {
			fields: [labEmbeddedFiles.labId],
			references: [labs.id],
		}),
	}),
);

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
