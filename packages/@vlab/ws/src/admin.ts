import { Type as t } from "@sinclair/typebox";
import { Router } from "waycast";
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

export const adminRouter = new Router<WSMeta>()
	.data("admin:worker:new", WorkerSchema)
	.data(
		"admin:worker:status",
		t.Pick(WorkerSchema, ["id", "status", "lastSeen"]),
	)
	.data(
		"admin:worker:metrics",
		t.Pick(WorkerSchema, [
			"id",
			"cpuUsagePercent",
			"memoryUsagePercent",
			"storageUsagePercent",
			"activeLabs",
			"activeNodes",
		]),
	);
