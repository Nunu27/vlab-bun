import { Type as t } from "@sinclair/typebox";

import { NonEmptyString } from "./common";

export const DeviceTemplateEnvSchema = t.Record(NonEmptyString(), t.String());

export const DeviceTemplateResourcesSchema = t.Object({
	cpu: t.Optional(t.Number()),
	memory: t.Optional(t.String()),
});

export const DeviceTemplateConnectionSchema = t.Object({
	type: t.Union([
		t.Literal("rdp"),
		t.Literal("vnc"),
		t.Literal("ssh"),
		t.Literal("telnet"),
	]),
	data: t.Object({
		port: t.Number(),
		username: t.Optional(NonEmptyString()),
		password: t.Optional(NonEmptyString()),
	}),
});

export const DeviceTemplateInterfaceSchema = t.Object({
	name: NonEmptyString(),
	configurable: t.Boolean(),
});

export type DeviceTemplateEnv = typeof DeviceTemplateEnvSchema.static;
export type DeviceTemplateResources =
	typeof DeviceTemplateResourcesSchema.static;
export type DeviceTemplateConnection =
	typeof DeviceTemplateConnectionSchema.static;
export type DeviceTemplateInterface =
	typeof DeviceTemplateInterfaceSchema.static;

export const CreateDeviceTemplateRequest = t.Object({
	name: NonEmptyString(),
	kind: NonEmptyString(),
	image: NonEmptyString(),
	icon: NonEmptyString(),
	deviceCategoryId: t.String({ format: "uuid" }),
	env: DeviceTemplateEnvSchema,
	resources: DeviceTemplateResourcesSchema,
	connection: DeviceTemplateConnectionSchema,
	interfaces: t.Array(DeviceTemplateInterfaceSchema),
});

export const UpdateDeviceTemplateRequest = t.Object({
	name: NonEmptyString(),
	kind: NonEmptyString(),
	image: NonEmptyString(),
	icon: NonEmptyString(),
	deviceCategoryId: t.String({ format: "uuid" }),
	env: DeviceTemplateEnvSchema,
	resources: DeviceTemplateResourcesSchema,
	connection: DeviceTemplateConnectionSchema,
	interfaces: t.Array(DeviceTemplateInterfaceSchema),
});
