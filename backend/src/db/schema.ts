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
	updatedAt: timestamp({ withTimezone: true })
};

// Auth tables
export const departments = pgTable("department", {
	...base,
	name: text().notNull()
});

export const degreeLevelEnum = pgEnum("degree_level", ["D3", "LJ", "D4", "S2"]);

export const studyPrograms = pgTable("study_program", {
	...base,
	name: text().notNull(),
	degreeLevel: degreeLevelEnum().notNull(),
	departmentId: uuid()
		.references(() => departments.id)
		.notNull()
});

export const roleEnum = pgEnum("roles", ["student", "lecturer", "admin"]);
export type Role = (typeof roleEnum.enumValues)[number];

export const users = pgTable("user", {
	...base,
	name: text().notNull(),
	email: text().notNull().unique(),
	passwordHash: text().notNull(),
	role: roleEnum().notNull().default("student")
});

export const students = pgTable("student", {
	...base,
	id: uuid()
		.primaryKey()
		.references(() => users.id),
	nrp: text().notNull().unique(),
	year: integer().notNull(),
	studyProgramId: uuid()
		.references(() => studyPrograms.id)
		.notNull()
});

export const lecturers = pgTable("lecturer", {
	...base,
	id: uuid()
		.primaryKey()
		.references(() => users.id),
	nip: text().notNull().unique()
});
