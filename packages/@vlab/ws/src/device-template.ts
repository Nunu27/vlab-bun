import { Type as t } from "@sinclair/typebox";
import {
	DeviceTemplateConnectionSchema,
	DeviceTemplateEnvSchema,
	DeviceTemplateResourcesSchema,
} from "@vlab/shared/schemas";
import { NonEmptyString } from "@vlab/shared/schemas/common";
import { Router } from "waycast";
import type { WSMeta } from "./types";

export const TestDeviceTemplateRequest = t.Object({
	name: NonEmptyString(),
	kind: NonEmptyString(),
	image: NonEmptyString(),
	env: DeviceTemplateEnvSchema,
	resources: DeviceTemplateResourcesSchema,
	connection: DeviceTemplateConnectionSchema,
});

export const deviceTemplateRouter = new Router<WSMeta>().rpc(
	"device-template:test",
	{
		payload: TestDeviceTemplateRequest,
		replies: {
			info: t.String(),
			warn: t.String(),
		},
		response: t.String(),
		meta: { private: ["admin"] },
	},
);
