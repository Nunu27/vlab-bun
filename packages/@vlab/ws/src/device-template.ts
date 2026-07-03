import { Type as t } from "@sinclair/typebox";
import {
	DeviceTemplateConnectionSchema,
	DeviceTemplateEnvSchema,
	DeviceTemplateResourcesSchema,
} from "@vlab/shared/schemas";
import { NonEmptyString } from "@vlab/shared/schemas/common";
import { toStandardSchema } from "@vlab/shared/standard-schema";
import Waycast from "waycast";
import type { WSMeta } from "./types";

export const TestDeviceTemplateRequest = t.Object({
	name: NonEmptyString(),
	kind: NonEmptyString(),
	image: NonEmptyString(),
	env: DeviceTemplateEnvSchema,
	resources: DeviceTemplateResourcesSchema,
	connection: DeviceTemplateConnectionSchema,
});

export const deviceTemplateRouter = new Waycast<WSMeta>().rpc(
	"device-template:test",
	{
		payload: toStandardSchema(TestDeviceTemplateRequest),
		replies: {
			info: toStandardSchema(t.String()),
			warn: toStandardSchema(t.String()),
			stats: toStandardSchema(
				t.Object({ cpuCores: t.Number(), memoryMB: t.Number() }),
			),
		},
		response: toStandardSchema(t.String()),
		meta: { private: ["admin"] },
	},
);
