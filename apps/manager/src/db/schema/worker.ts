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
		id: text().primaryKey(),
		status: workerStatusEnum().default("offline").notNull(),
		managerId: text().notNull(),
		guacdHost: text().notNull(),
		guacdPort: integer().notNull(),
		lastSeen: timestamp({ withTimezone: true }).defaultNow().notNull(),
		cpuCores: integer().notNull(),
		memoryMB: integer().notNull(),
		storageMB: integer().notNull(),
		cpuUsagePercent: numeric().notNull(),
		memoryUsagePercent: numeric().notNull(),
		storageUsagePercent: numeric().notNull(),
		cpuThresholdPercent: integer().default(75).notNull(),
		memoryThresholdPercent: integer().default(85).notNull(),
		activeLabs: integer().default(0).notNull(),
		activeNodes: integer().default(0).notNull(),
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
