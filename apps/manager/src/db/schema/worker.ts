import { sql } from "drizzle-orm";
import {
	check,
	integer,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { base } from "./base";

export const workerStatusEnum = pgEnum("worker_status", ["online", "offline"]);

export const workers = pgTable(
	"worker",
	{
		...base,
		id: text("id").primaryKey(),
		status: workerStatusEnum("status").default("offline").notNull(),
		managerId: text("manager_id"),
		lastSeen: timestamp("last_seen", { withTimezone: true })
			.defaultNow()
			.notNull(),
		cpuCores: integer("cpu_cores").notNull(),
		memoryMB: integer("memory_mb").notNull(),
		storageMB: integer("storage_mb").notNull(),
		cpuUsagePercent: numeric("cpu_usage_percent").notNull(),
		memoryUsagePercent: numeric("memory_usage_percent").notNull(),
		storageUsagePercent: numeric("storage_usage_percent").notNull(),
		score: numeric("score").notNull(),
		activeLabs: integer("active_labs").default(0).notNull(),
		activeNodes: integer("active_nodes").default(0).notNull(),
	},
	(t) => [
		check("worker_cpu_cores_positive", sql`${t.cpuCores} > 0`),
		check("worker_memory_mb_positive", sql`${t.memoryMB} > 0`),
		check("worker_storage_mb_positive", sql`${t.storageMB} > 0`),
		check(
			"worker_cpu_usage_percent_range",
			sql`${t.cpuUsagePercent} BETWEEN 0 AND 100`,
		),
		check(
			"worker_memory_usage_percent_range",
			sql`${t.memoryUsagePercent} BETWEEN 0 AND 100`,
		),
		check(
			"worker_storage_usage_percent_range",
			sql`${t.storageUsagePercent} BETWEEN 0 AND 100`,
		),
	],
);
