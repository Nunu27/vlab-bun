import { WSContracts } from "@jawit/ws";
import { Type as t } from "@sinclair/typebox";
import { deviceKindValues } from "@vlab/shared/enums";
import { NonEmptyString } from "@vlab/shared/schemas/common";
import {
	DeviceTemplateConnectionSchema,
	DeviceTemplateEnvSchema,
	DeviceTemplateResourcesSchema,
} from "@vlab/shared/schemas/device-template";
import type { WSMeta } from "./types";

export const TestDeviceTemplateRequest = t.Object({
	name: NonEmptyString(),
	kind: t.Union(deviceKindValues.map((v) => t.Literal(v))),
	image: NonEmptyString(),
	env: DeviceTemplateEnvSchema,
	resources: DeviceTemplateResourcesSchema,
	connection: DeviceTemplateConnectionSchema,
});

export default new WSContracts<WSMeta>().register({
	event: "device-template:test",
	type: "client2server",
	data: TestDeviceTemplateRequest,
	replies: {
		info: t.String(),
		warn: t.String(),
		error: t.String(),
		token: t.String(),
	},
	meta: { private: ["admin"] },
});
