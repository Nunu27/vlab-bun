import { jsonb, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";
import { base } from "./base";

export const deviceKindEnum = pgEnum("device_kind", [
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
export type DeviceInterface = {
	code: string;
	name: string;
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
	icon: text().notNull(),
	name: text().notNull()
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
		.references(() => deviceCategories.id)
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

export const deviceTestSessions = pgTable("device_test_session", {
	...base,
	name: text().notNull(),
	socketId: text().notNull(),
	leasedPorts: jsonb().$type<number[]>().notNull()
});
