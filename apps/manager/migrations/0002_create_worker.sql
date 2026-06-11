CREATE TYPE "public"."worker_status" AS ENUM('online', 'offline');--> statement-breakpoint
CREATE TABLE "worker" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"status" "worker_status" DEFAULT 'offline' NOT NULL,
	"manager_id" text,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"cpu_cores" integer NOT NULL,
	"memory_mb" integer NOT NULL,
	"storage_mb" integer NOT NULL,
	"cpu_usage_percent" numeric NOT NULL,
	"memory_usage_percent" numeric NOT NULL,
	"storage_usage_percent" numeric NOT NULL,
	"score" numeric NOT NULL,
	"active_labs" integer DEFAULT 0 NOT NULL,
	"active_nodes" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "worker_cpu_cores_positive" CHECK ("worker"."cpu_cores" > 0),
	CONSTRAINT "worker_memory_mb_positive" CHECK ("worker"."memory_mb" > 0),
	CONSTRAINT "worker_storage_mb_positive" CHECK ("worker"."storage_mb" > 0),
	CONSTRAINT "worker_cpu_usage_percent_range" CHECK ("worker"."cpu_usage_percent" BETWEEN 0 AND 100),
	CONSTRAINT "worker_memory_usage_percent_range" CHECK ("worker"."memory_usage_percent" BETWEEN 0 AND 100),
	CONSTRAINT "worker_storage_usage_percent_range" CHECK ("worker"."storage_usage_percent" BETWEEN 0 AND 100)
);
--> statement-breakpoint
ALTER TABLE "device_template" ALTER COLUMN "kind" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "lab_session" ADD COLUMN "worker_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_session" ADD CONSTRAINT "lab_session_worker_id_worker_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
DROP TYPE "public"."device_kind";