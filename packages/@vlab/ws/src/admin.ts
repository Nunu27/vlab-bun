import { Type as t } from "@sinclair/typebox";
import { toStandardSchema } from "@vlab/shared/standard-schema";
import Waycast from "waycast";
import type { WSMeta } from "./types";

const WorkerSchema = t.Object({
	id: t.String(),
	status: t.Union([t.Literal("online"), t.Literal("offline")]),
	lastSeen: t.Date(),
	cpuCores: t.Number(),
	memoryMB: t.Number(),
	storageMB: t.Number(),
	cpuUsagePercent: t.String(),
	memoryUsagePercent: t.String(),
	storageUsagePercent: t.String(),
	activeLabs: t.Number(),
	activeNodes: t.Number(),
});

export const adminRouter = new Waycast<WSMeta>()
	.data("admin:worker:new", toStandardSchema(WorkerSchema))
	.data(
		"admin:worker:status",
		toStandardSchema(t.Pick(WorkerSchema, ["id", "status", "lastSeen"])),
	)
	.data(
		"admin:worker:metrics",
		toStandardSchema(
			t.Pick(WorkerSchema, [
				"id",
				"cpuUsagePercent",
				"memoryUsagePercent",
				"storageUsagePercent",
				"activeLabs",
				"activeNodes",
			]),
		),
	);
