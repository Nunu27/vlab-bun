import { degreeLevelValues, roleValues } from "@vlab/shared/enums";
import { integer, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";
import { base } from "./base";

export const roleEnum = pgEnum("role", roleValues);
export const degreeLevelEnum = pgEnum("degree_level", degreeLevelValues);

export const departments = pgTable("department", {
	...base,
	name: text().unique().notNull(),
});

export const departmentsRelations = relations(departments, ({ many }) => ({
	studyPrograms: many(studyPrograms),
}));

export const studyPrograms = pgTable("study_program", {
	...base,
	name: text().unique().notNull(),
	departmentId: uuid()
		.references(() => departments.id, { onDelete: "restrict" })
		.notNull(),
});

export const studyProgramsRelations = relations(
	studyPrograms,
	({ one, many }) => ({
		department: one(departments, {
			fields: [studyPrograms.departmentId],
			references: [departments.id],
		}),
		students: many(students),
	}),
);

export const users = pgTable("user", {
	...base,
	name: text().notNull(),
	email: text().unique().notNull(),
	passwordHash: text(),
	role: roleEnum().default("student").notNull(),
});

export const usersRelations = relations(users, ({ one }) => ({
	student: one(students, {
		fields: [users.id],
		references: [students.id],
	}),
	instructor: one(instructors, {
		fields: [users.id],
		references: [instructors.id],
	}),
}));

export const students = pgTable("student", {
	...base,
	id: uuid()
		.primaryKey()
		.references(() => users.id, { onDelete: "cascade" }),
	nrp: text().unique().notNull(),
	year: integer().notNull(),
	degreeLevel: degreeLevelEnum().notNull(),
	studyProgramId: uuid()
		.references(() => studyPrograms.id, { onDelete: "restrict" })
		.notNull(),
});

export const studentsRelations = relations(students, ({ one }) => ({
	user: one(users, {
		fields: [students.id],
		references: [users.id],
	}),
	studyProgram: one(studyPrograms, {
		fields: [students.studyProgramId],
		references: [studyPrograms.id],
	}),
}));

export const instructors = pgTable("instructor", {
	...base,
	id: uuid()
		.primaryKey()
		.references(() => users.id, { onDelete: "cascade" }),
	nip: text().unique().notNull(),
});

export const instructorsRelations = relations(instructors, ({ one }) => ({
	user: one(users, {
		fields: [instructors.id],
		references: [users.id],
	}),
}));
