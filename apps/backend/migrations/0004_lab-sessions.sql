CREATE TYPE "public"."lab_type" AS ENUM('user', 'device-test');--> statement-breakpoint
CREATE TYPE "public"."node_health" AS ENUM('healthy', 'unhealthy', 'starting');--> statement-breakpoint
CREATE TYPE "public"."node_status" AS ENUM('created', 'restarting', 'running', 'removing', 'paused', 'exited', 'dead');--> statement-breakpoint
CREATE TABLE "lab_node" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"name" text NOT NULL,
	"health" "node_health",
	"status" "node_status" DEFAULT 'created' NOT NULL,
	"device_id" uuid,
	"lab_session_id" uuid NOT NULL,
	"ports" jsonb NOT NULL,
	"interfaces" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"name" text NOT NULL,
	"type" "lab_type" NOT NULL,
	"lab_id" uuid,
	"owner_id" uuid NOT NULL,
	"ports" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"name" text NOT NULL,
	"author_id" uuid NOT NULL
);
--> statement-breakpoint
DROP TABLE "device_test_session" CASCADE;--> statement-breakpoint
ALTER TABLE "lab_node" ADD CONSTRAINT "lab_node_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_node" ADD CONSTRAINT "lab_node_lab_session_id_lab_session_id_fk" FOREIGN KEY ("lab_session_id") REFERENCES "public"."lab_session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_session" ADD CONSTRAINT "lab_session_lab_id_lab_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."lab"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_session" ADD CONSTRAINT "lab_session_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab" ADD CONSTRAINT "lab_author_id_lecturer_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."lecturer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lab_session_type_created_at_index" ON "lab_session" USING btree ("type","created_at");