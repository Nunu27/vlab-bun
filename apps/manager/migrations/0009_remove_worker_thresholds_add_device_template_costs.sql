ALTER TABLE "device_template" ADD COLUMN "cpu_cost_cores" real;--> statement-breakpoint
ALTER TABLE "device_template" ADD COLUMN "memory_cost_mb" integer;--> statement-breakpoint
ALTER TABLE "worker" DROP COLUMN "cpu_threshold_percent";--> statement-breakpoint
ALTER TABLE "worker" DROP COLUMN "memory_threshold_percent";