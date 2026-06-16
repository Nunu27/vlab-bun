import { nodeHealthValues } from "@vlab/shared/enums";
import {
	boolean,
	jsonb,
	numeric,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";
import { students } from "./auth";
import { base } from "./base";
import { deviceTemplates } from "./device-template";
import { labs } from "./lab";
import { workers } from "./worker";

export const nodeHealthEnum = pgEnum("node_health", nodeHealthValues);

export const labSessions = pgTable("lab_session", {
	...base,
	labId: uuid()
		.notNull()
		.references(() => labs.id, { onDelete: "cascade" }),
	studentId: uuid()
		.notNull()
		.references(() => students.id, { onDelete: "cascade" }),
	workerId: text()
		.notNull()
		.references(() => workers.id, { onDelete: "cascade" }),
	clientId: text(),
	score: numeric().notNull().default("0"),
	submittedAt: timestamp({ withTimezone: true }),
	dueDate: timestamp({ withTimezone: true }).notNull(),
});

export const labSessionsRelations = relations(labSessions, ({ one, many }) => ({
	lab: one(labs, {
		fields: [labSessions.labId],
		references: [labs.id],
	}),
	student: one(students, {
		fields: [labSessions.studentId],
		references: [students.id],
	}),
	worker: one(workers, {
		fields: [labSessions.workerId],
		references: [workers.id],
	}),
	checks: many(labSessionChecks),
	nodes: many(labSessionNodes),
}));

export const labSessionChecks = pgTable(
	"lab_session_check",
	{
		labSessionId: uuid()
			.notNull()
			.references(() => labSessions.id, { onDelete: "cascade" }),
		checkId: uuid().notNull(),
		completed: boolean().notNull().default(false),
	},
	(table) => [primaryKey({ columns: [table.labSessionId, table.checkId] })],
);

export const labSessionChecksRelations = relations(
	labSessionChecks,
	({ one }) => ({
		labSession: one(labSessions, {
			fields: [labSessionChecks.labSessionId],
			references: [labSessions.id],
		}),
	}),
);

export const labSessionNodes = pgTable("lab_session_node", {
	...base,
	name: text().notNull(),
	health: nodeHealthEnum(),
	ip: text().notNull(),
	interfaces: jsonb().$type<Record<string, string[]>>().notNull(),
	labNodeId: uuid().notNull(),
	containerId: text().notNull(),
	token: text().notNull(),
	labSessionId: uuid()
		.notNull()
		.references(() => labSessions.id, { onDelete: "cascade" }),
	deviceTemplateId: uuid()
		.notNull()
		.references(() => deviceTemplates.id, { onDelete: "restrict" }),
});

export const labSessionNodesRelations = relations(
	labSessionNodes,
	({ one }) => ({
		labSession: one(labSessions, {
			fields: [labSessionNodes.labSessionId],
			references: [labSessions.id],
		}),
		deviceTemplate: one(deviceTemplates, {
			fields: [labSessionNodes.deviceTemplateId],
			references: [deviceTemplates.id],
		}),
	}),
);
