CREATE TYPE "public"."degree_level" AS ENUM('D3', 'LJ', 'D4', 'S2');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('student', 'instructor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."device_kind" AS ENUM('nokia_srlinux', 'nokia_sros', 'nokia_srsim', 'arista_ceos', 'arista_veos', 'juniper_crpd', 'juniper_vmx', 'juniper_vqfx', 'juniper_vsrx', 'juniper_vjunosrouter', 'juniper_vjunosswitch', 'juniper_vjunosevolved', 'juniper_cjunosevolved', 'cisco_xrd', 'cisco_xrv', 'cisco_xrv9k', 'cisco_csr1000v', 'cisco_n9kv', 'cisco_c8000', 'cisco_c8000v', 'cisco_cat9kv', 'cisco_iol', 'cisco_ftdv', 'cumulus_cvx', 'aruba_aoscx', 'sonic-vs', 'sonic-vm', 'dell_ftosv', 'dell_sonic', 'mikrotik_ros', 'huawei_vrp', 'ipinfusion_ocnos', 'paloalto_panos', 'fortinet_fortigate', 'checkpoint_cloudguard', '6wind_vsr', 'keysight_ixia-c-one', 'arrcus_arcos', 'fdio_vpp', 'rare', 'vyosnetworks_vyos', 'generic_vm', 'linux', 'freebsd', 'openwrt', 'openbsd', 'k8s-kind', 'bridge', 'ovs-bridge', 'ext-container', 'host');--> statement-breakpoint
CREATE TYPE "public"."node_health" AS ENUM('healthy', 'unhealthy', 'starting');--> statement-breakpoint
CREATE TABLE "department" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"name" text NOT NULL,
	CONSTRAINT "department_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "instructor" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"nip" text NOT NULL,
	CONSTRAINT "instructor_nip_unique" UNIQUE("nip")
);
--> statement-breakpoint
CREATE TABLE "student" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"nrp" text NOT NULL,
	"year" integer NOT NULL,
	"degree_level" "degree_level" NOT NULL,
	"study_program_id" uuid NOT NULL,
	CONSTRAINT "student_nrp_unique" UNIQUE("nrp")
);
--> statement-breakpoint
CREATE TABLE "study_program" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"name" text NOT NULL,
	"department_id" uuid NOT NULL,
	CONSTRAINT "study_program_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"role" "role" DEFAULT 'student' NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "device_category" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"name" text NOT NULL,
	"color" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_template" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"kind" "device_kind" NOT NULL,
	"image" text NOT NULL,
	"device_category_id" uuid NOT NULL,
	"env" jsonb NOT NULL,
	"resources" jsonb NOT NULL,
	"connection" jsonb NOT NULL,
	"interfaces" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"name" text NOT NULL,
	"used_by" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "file_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "lab_attachments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"name" text NOT NULL,
	"file" text NOT NULL,
	"lab_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_enrollment" (
	"lab_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "lab_enrollment_lab_id_student_id_pk" PRIMARY KEY("lab_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "lab" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"name" text NOT NULL,
	"cover" text,
	"content" text NOT NULL,
	"max_attempt" integer,
	"topology" jsonb NOT NULL,
	"instructions" jsonb NOT NULL,
	"instructor_id" uuid NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_session_check" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"lab_session_id" uuid NOT NULL,
	"check_id" uuid NOT NULL,
	"completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_session_node" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"name" text NOT NULL,
	"health" "node_health",
	"ip" text NOT NULL,
	"interfaces" jsonb NOT NULL,
	"lab_node_id" uuid NOT NULL,
	"container_id" text NOT NULL,
	"lab_session_id" uuid NOT NULL,
	"device_template_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"lab_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"client_id" uuid,
	"score" numeric DEFAULT '0' NOT NULL,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "instructor" ADD CONSTRAINT "instructor_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student" ADD CONSTRAINT "student_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student" ADD CONSTRAINT "student_study_program_id_study_program_id_fk" FOREIGN KEY ("study_program_id") REFERENCES "public"."study_program"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_program" ADD CONSTRAINT "study_program_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_template" ADD CONSTRAINT "device_template_device_category_id_device_category_id_fk" FOREIGN KEY ("device_category_id") REFERENCES "public"."device_category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_attachments" ADD CONSTRAINT "lab_attachments_lab_id_lab_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."lab"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_enrollment" ADD CONSTRAINT "lab_enrollment_lab_id_lab_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."lab"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_enrollment" ADD CONSTRAINT "lab_enrollment_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab" ADD CONSTRAINT "lab_instructor_id_instructor_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructor"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_session_check" ADD CONSTRAINT "lab_session_check_lab_session_id_lab_session_id_fk" FOREIGN KEY ("lab_session_id") REFERENCES "public"."lab_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_session_node" ADD CONSTRAINT "lab_session_node_lab_session_id_lab_session_id_fk" FOREIGN KEY ("lab_session_id") REFERENCES "public"."lab_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_session_node" ADD CONSTRAINT "lab_session_node_device_template_id_device_template_id_fk" FOREIGN KEY ("device_template_id") REFERENCES "public"."device_template"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_session" ADD CONSTRAINT "lab_session_lab_id_lab_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."lab"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_session" ADD CONSTRAINT "lab_session_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "file_name_index" ON "file" USING btree ("name");