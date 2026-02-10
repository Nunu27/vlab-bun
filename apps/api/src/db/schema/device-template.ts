import { deviceKindValues } from "@vlab/shared/enums";
import type {
	DeviceTemplateConnection,
	DeviceTemplateEnv,
	DeviceTemplateInterface,
	DeviceTemplateResources,
} from "@vlab/shared/schemas/device-template";
import { jsonb, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";
import { base } from "./base";

export const deviceCategories = pgTable("device_category", {
	...base,
	name: text().notNull(),
	color: text().notNull(),
});

export const deviceCategoriesRelations = relations(
	deviceCategories,
	({ many }) => ({
		templates: many(deviceTemplates),
	}),
);

export const deviceKindEnum = pgEnum("device_kind", deviceKindValues);

export const deviceTemplates = pgTable("device_template", {
	...base,
	name: text().notNull(),
	icon: text().notNull(),
	kind: deviceKindEnum().notNull(),
	image: text().notNull(),
	deviceCategoryId: uuid()
		.references(() => deviceCategories.id, { onDelete: "restrict" })
		.notNull(),
	env: jsonb().$type<DeviceTemplateEnv>().notNull(),
	resources: jsonb().$type<DeviceTemplateResources>().notNull(),
	connection: jsonb().$type<DeviceTemplateConnection>().notNull(),
	interfaces: jsonb().$type<DeviceTemplateInterface[]>().notNull(),
});

export const deviceTemplatesRelations = relations(
	deviceTemplates,
	({ one }) => ({
		category: one(deviceCategories, {
			fields: [deviceTemplates.deviceCategoryId],
			references: [deviceCategories.id],
		}),
	}),
);
