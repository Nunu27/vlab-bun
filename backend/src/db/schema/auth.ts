import { relations } from "drizzle-orm";
import {
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid
} from "drizzle-orm/pg-core";

const base = {
	id: uuid()
		.primaryKey()
		.$default(() => Bun.randomUUIDv7()),
	createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true }).$onUpdate(() => new Date())
};

// Auth tables
export const departments = pgTable("department", {
	...base,
	name: text().unique().notNull()
});

export const degreeLevelEnum = pgEnum("degree_level", ["D3", "LJ", "D4", "S2"]);

export const studyPrograms = pgTable("study_program", {
	...base,
	name: text().unique().notNull(),
	departmentId: uuid()
		.references(() => departments.id, { onDelete: "restrict" })
		.notNull()
});

export const studyProgramsRelations = relations(studyPrograms, ({ one }) => ({
	department: one(departments, {
		fields: [studyPrograms.departmentId],
		references: [departments.id]
	})
}));

export const roleEnum = pgEnum("role", ["student", "lecturer", "admin"]);
export type Role = (typeof roleEnum.enumValues)[number];

export const users = pgTable("user", {
	...base,
	name: text().notNull(),
	email: text().notNull().unique(),
	passwordHash: text().notNull(),
	role: roleEnum().notNull().default("student")
});

export const usersRelations = relations(users, ({ one }) => ({
	student: one(students, {
		fields: [users.id],
		references: [students.id]
	}),
	lecturer: one(lecturers, {
		fields: [users.id],
		references: [lecturers.id]
	})
}));

export const students = pgTable("student", {
	...base,
	id: uuid()
		.primaryKey()
		.references(() => users.id, { onDelete: "cascade" }),
	nrp: text().notNull().unique(),
	year: integer().notNull(),
	degreeLevel: degreeLevelEnum().notNull(),
	studyProgramId: uuid()
		.references(() => studyPrograms.id, { onDelete: "restrict" })
		.notNull()
});

export const studentsRelations = relations(students, ({ one }) => ({
	user: one(users, {
		fields: [students.id],
		references: [users.id]
	}),
	studyProgram: one(studyPrograms, {
		fields: [students.studyProgramId],
		references: [studyPrograms.id]
	})
}));

export const lecturers = pgTable("lecturer", {
	...base,
	id: uuid()
		.primaryKey()
		.references(() => users.id, { onDelete: "cascade" }),
	nip: text().notNull().unique()
});

export const lecturersRelations = relations(lecturers, ({ one }) => ({
	user: one(users, {
		fields: [lecturers.id],
		references: [users.id]
	})
}));
