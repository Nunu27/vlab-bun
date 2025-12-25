import { jsonb, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";
import { deviceKindEnum as deviceKindValues } from "@vlab/shared/enums";
import { base } from "./base";

export const deviceKindEnum = pgEnum("device_kind", deviceKindValues);
export type DeviceInterface = {
	displayCode: string;
	internalCode: string;
	configurable: boolean;
};
export type DeviceEnv = {
	[key: string]: string;
};
export type DeviceResources = {
	cpu?: number;
	memory?: string;
};
export type DeviceConnection = {
	type: "rdp" | "vnc" | "ssh" | "telnet";
	data: {
		port: number;
		username?: string;
		password?: string;
	};
};

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
