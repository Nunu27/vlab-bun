import { nodeHealthValues } from "@vlab/shared/enums";
import {
	boolean,
	jsonb,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";
import { students } from "./auth";
import { base } from "./base";
import { labs } from "./lab";

export const nodeHealthEnum = pgEnum("node_health", nodeHealthValues);

export const labSessions = pgTable("lab_session", {
	...base,
	labId: uuid()
		.references(() => labs.id, { onDelete: "restrict" })
		.notNull(),
	studentId: uuid()
		.references(() => students.id, { onDelete: "restrict" })
		.notNull(),
	clientId: uuid(),
	score: numeric(),
	submittedAt: timestamp({ withTimezone: true }),
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
	checks: many(labSessionChecks),
	nodes: many(labSessionNodes),
}));

export const labSessionChecks = pgTable("lab_session_check", {
	...base,
	labSessionId: uuid()
		.references(() => labSessions.id, { onDelete: "cascade" })
		.notNull(),
	checkId: uuid().notNull(),
	completed: boolean().default(false).notNull(),
});

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
	ports: jsonb().notNull(),
	interfaces: jsonb().notNull(),
	containerId: text().notNull(),
	labSessionId: uuid()
		.references(() => labSessions.id, { onDelete: "cascade" })
		.notNull(),
});

export const labSessionNodesRelations = relations(
	labSessionNodes,
	({ one }) => ({
		labSession: one(labSessions, {
			fields: [labSessionNodes.labSessionId],
			references: [labSessions.id],
		}),
	}),
);
