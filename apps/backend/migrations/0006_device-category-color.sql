ALTER TABLE "device_category" ADD COLUMN "color" text NOT NULL;--> statement-breakpoint
ALTER TABLE "lab" ADD COLUMN "topology" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "device_category" DROP COLUMN "icon";