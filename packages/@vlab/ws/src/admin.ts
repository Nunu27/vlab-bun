import { Type as t } from "@sinclair/typebox";
import { Router } from "waycast";
import type { WSMeta } from "./types";

const WorkerSchema = t.Object({
	id: t.String(),
	status: t.String(),
	lastSeen: t.Union([t.Date(), t.String()]),
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
		t.Object({
			id: t.String(),
			status: t.String(),
		}),
	)
	.data(
		"admin:worker:metrics",
		t.Object({
			id: t.String(),
			cpuUsagePercent: t.String(),
			memoryUsagePercent: t.String(),
			storageUsagePercent: t.String(),
			activeLabs: t.Number(),
			activeNodes: t.Number(),
		}),
	);
