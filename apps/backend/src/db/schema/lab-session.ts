import {
	labTypeEnum as labTypeValues,
	nodeHealthEnum as nodeHealthEnumValues
} from "@vlab/shared/enums";
import { index, jsonb, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";
import { users } from "./auth";
import { base } from "./base";
import { labs } from "./lab";
import { devices } from "./lab-device";

export const labTypeEnum = pgEnum("lab_type", labTypeValues);

export const labSessions = pgTable(
	"lab_session",
	{
		...base,
		type: labTypeEnum().notNull(),
		labId: uuid().references(() => labs.id, { onDelete: "restrict" }),
		ownerId: uuid()
			.references(() => users.id, { onDelete: "cascade" })
			.notNull()
	},
	(t) => [index().on(t.type, t.createdAt)]
);

export const labSessionsRelations = relations(labSessions, ({ many, one }) => ({
	lab: one(labs, {
		fields: [labSessions.labId],
		references: [labs.id]
	}),
	nodes: many(labNodes)
}));

export const nodeHealthEnum = pgEnum("node_health", nodeHealthEnumValues);

export const labNodes = pgTable("lab_node", {
	...base,
	name: text().notNull(),
	health: nodeHealthEnum(),
	deviceId: uuid().references(() => devices.id, { onDelete: "set null" }),
	labSessionId: uuid()
		.references(() => labSessions.id, { onDelete: "cascade" })
		.notNull(),
	ports: jsonb().$type<Record<number, number>>().notNull(),
	interfaces: jsonb().$type<Record<string, string[]>>().notNull()
});

export const labNodesRelations = relations(labNodes, ({ one }) => ({
	labSession: one(labSessions, {
		fields: [labNodes.labSessionId],
		references: [labSessions.id]
	}),
	device: one(devices, {
		fields: [labNodes.deviceId],
		references: [devices.id]
	})
}));
