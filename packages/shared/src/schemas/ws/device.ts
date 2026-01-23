import { deviceKindEnum } from "@shared/enums";
import { createWSSchema } from "@shared/types/ws";
import { t } from "elysia/type-system";
import { NonEmptyString } from "../common";
import {
	DeviceConnectionSchema,
	DeviceEnvSchema,
	DeviceInterfaceSchema,
	DeviceResourcesSchema
} from "../rest/device";

export const DeviceTestRequest = t.Object({
	name: NonEmptyString(),
	kind: t.UnionEnum(deviceKindEnum),
	image: NonEmptyString(),
	env: DeviceEnvSchema,
	resources: DeviceResourcesSchema,
	connection: DeviceConnectionSchema,
	interfaces: t.Array(DeviceInterfaceSchema)
});

export const deviceWSSchemas = [
	createWSSchema({
		type: "client2server",
		name: "device/test",
		private: ["admin"],
		reply: {
			message: t.String(),
			warn: t.String(),
			token: t.String()
		},
		data: DeviceTestRequest
	})
] as const;
