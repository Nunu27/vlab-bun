import { t } from "elysia/type-system";
import { connectionTypeEnum, deviceKindEnum } from "../../enums";
import { NonEmptyString } from "../common";

export const DeviceEnvSchema = t.Record(NonEmptyString(), t.String());

export const DeviceResourcesSchema = t.Object({
	cpu: t.Optional(t.Number()),
	memory: t.Optional(t.String())
});

export const DeviceConnectionSchema = t.Object({
	type: t.UnionEnum(connectionTypeEnum),
	data: t.Object({
		port: t.Number(),
		username: t.Optional(NonEmptyString()),
		password: t.Optional(NonEmptyString())
	})
});

export const DeviceInterfaceSchema = t.Object({
	name: NonEmptyString(),
	configurable: t.Boolean()
});

export type DeviceEnv = typeof DeviceEnvSchema.static;
export type DeviceResources = typeof DeviceResourcesSchema.static;
export type DeviceConnection = typeof DeviceConnectionSchema.static;
export type DeviceInterface = typeof DeviceInterfaceSchema.static;

export const CreateDeviceRequest = t.Object({
	name: NonEmptyString({ title: "Name" }),
	kind: t.UnionEnum(deviceKindEnum),
	image: NonEmptyString({ title: "Image" }),
	icon: NonEmptyString({ title: "Icon" }),
	categoryId: t.String({ format: "uuid" }),
	env: DeviceEnvSchema,
	resources: DeviceResourcesSchema,
	connection: DeviceConnectionSchema,
	interfaces: t.Array(DeviceInterfaceSchema)
});

export const UpdateDeviceRequest = t.Object({
	name: NonEmptyString(),
	kind: t.UnionEnum(deviceKindEnum),
	image: NonEmptyString(),
	icon: NonEmptyString(),
	categoryId: t.String({ format: "uuid" }),
	env: DeviceEnvSchema,
	resources: DeviceResourcesSchema,
	connection: DeviceConnectionSchema,
	interfaces: t.Array(DeviceInterfaceSchema)
});
