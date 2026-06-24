ALTER TABLE "worker" ADD COLUMN "cpu_threshold_percent" integer DEFAULT 75 NOT NULL;--> statement-breakpoint
ALTER TABLE "worker" ADD COLUMN "memory_threshold_percent" integer DEFAULT 85 NOT NULL;--> statement-breakpoint
ALTER TABLE "worker" DROP COLUMN "score";