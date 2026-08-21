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
	// Carried so the test reserves what this device actually needs. Without
	// them the reservation falls back to the generic defaults, which silently
	// under-reserves for anything bigger than a small container.
	cpuCostCores: t.Optional(t.Union([t.Number(), t.Null()])),
	memoryCostMB: t.Optional(t.Union([t.Integer(), t.Null()])),
});

export const DeviceTemplateStats = t.Object({
	// What the device actually used: peak memory, median CPU. No headroom is
	// added - this is a reservation, not a cap.
	cpuCores: t.Number(),
	memoryMB: t.Number(),
	// High-water mark including boot, which the cap must survive even though
	// the cost is set from settled usage.
	peakMemoryMB: t.Number(),
	samples: t.Number(),
	// The cap the device was measured under, null when it is uncapped.
	memoryLimitMB: t.Union([t.Number(), t.Null()]),
	// Measurement taken so close to the cap that it understates real need.
	limitLooksTight: t.Boolean(),
});

export type DeviceTemplateStats = typeof DeviceTemplateStats.static;

export const deviceTemplateRouter = new Waycast<WSMeta>().rpc(
	"device-template:test",
	{
		payload: toStandardSchema(TestDeviceTemplateRequest),
		replies: {
			info: toStandardSchema(t.String()),
			warn: toStandardSchema(t.String()),
			stats: toStandardSchema(DeviceTemplateStats),
		},
		response: toStandardSchema(t.String()),
		meta: { private: ["admin"] },
	},
);
