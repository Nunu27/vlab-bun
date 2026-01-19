import { deviceKindEnum as deviceKindValues } from "@vlab/shared/enums";
import type {
	DeviceConnection,
	DeviceEnv,
	DeviceInterface,
	DeviceResources
} from "@vlab/shared/schemas";
import { jsonb, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";
import { base } from "./base";

export const deviceKindEnum = pgEnum("device_kind", deviceKindValues);

export const deviceCategories = pgTable("device_category", {
	...base,
	name: text().notNull(),
	color: text().notNull()
});

export const deviceCategoriesRelations = relations(
	deviceCategories,
	({ many }) => ({
		devices: many(devices)
	})
);

export const devices = pgTable("device", {
	...base,
	name: text().notNull(),
	kind: deviceKindEnum().notNull(),
	image: text().notNull(),
	icon: text().notNull(),
	categoryId: uuid()
		.references(() => deviceCategories.id, { onDelete: "restrict" })
		.notNull(),
	env: jsonb().$type<DeviceEnv>().notNull(),
	resources: jsonb().$type<DeviceResources>().notNull(),
	connection: jsonb().$type<DeviceConnection>().notNull(),
	interfaces: jsonb().$type<DeviceInterface[]>().notNull()
});

export const devicesRelations = relations(devices, ({ one }) => ({
	category: one(deviceCategories, {
		fields: [devices.categoryId],
		references: [deviceCategories.id]
	})
}));
