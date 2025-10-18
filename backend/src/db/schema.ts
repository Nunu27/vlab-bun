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
		.references(() => departments.id)
		.notNull()
});

export const studyProgramsRelations = relations(studyPrograms, ({ one }) => ({
	department: one(departments, {
		fields: [studyPrograms.departmentId],
		references: [departments.id]
	})
}));

export const roleEnum = pgEnum("roles", ["student", "lecturer", "admin"]);
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
	lecturer: one(students, {
		fields: [users.id],
		references: [students.id]
	})
}));

export const students = pgTable("student", {
	...base,
	id: uuid()
		.primaryKey()
		.references(() => users.id),
	nrp: text().notNull().unique(),
	year: integer().notNull(),
	degreeLevel: degreeLevelEnum().notNull(),
	studyProgramId: uuid()
		.references(() => studyPrograms.id)
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
		.references(() => users.id),
	nip: text().notNull().unique()
});

export const lecturersRelations = relations(lecturers, ({ one }) => ({
	user: one(users, {
		fields: [lecturers.id],
		references: [users.id]
	})
}));

// Labs tables
export const deviceKindEnum = pgEnum("deviceKind", [
	"nokia_srlinux",
	"nokia_sros",
	"nokia_srsim",
	"arista_ceos",
	"arista_veos",
	"juniper_crpd",
	"juniper_vmx",
	"juniper_vqfx",
	"juniper_vsrx",
	"juniper_vjunosrouter",
	"juniper_vjunosswitch",
	"juniper_vjunosevolved",
	"juniper_cjunosevolved",
	"cisco_xrd",
	"cisco_xrv",
	"cisco_xrv9k",
	"cisco_csr1000v",
	"cisco_n9kv",
	"cisco_c8000",
	"cisco_c8000v",
	"cisco_cat9kv",
	"cisco_iol",
	"cisco_ftdv",
	"cumulus_cvx",
	"aruba_aoscx",
	"sonic-vs",
	"sonic-vm",
	"dell_ftosv",
	"dell_sonic",
	"mikrotik_ros",
	"huawei_vrp",
	"ipinfusion_ocnos",
	"paloalto_panos",
	"fortinet_fortigate",
	"checkpoint_cloudguard",
	"6wind_vsr",
	"keysight_ixia-c-one",
	"arrcus_arcos",
	"fdio_vpp",
	"rare",
	"vyosnetworks_vyos",
	"generic_vm",
	"linux",
	"freebsd",
	"openwrt",
	"openbsd",
	"k8s-kind",
	"bridge",
	"ovs-bridge",
	"ext-container",
	"host"
]);
export type DeviceKind = (typeof deviceKindEnum.enumValues)[number];
