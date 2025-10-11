CREATE TYPE "public"."degree_level" AS ENUM('D3', 'LJ', 'D4', 'S2');--> statement-breakpoint
CREATE TYPE "public"."roles" AS ENUM('student', 'lecturer', 'admin');--> statement-breakpoint
CREATE TABLE "department" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"name" text NOT NULL,
	CONSTRAINT "department_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "lecturer" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"nip" text NOT NULL,
	CONSTRAINT "lecturer_nip_unique" UNIQUE("nip")
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
	"password_hash" text NOT NULL,
	"role" "roles" DEFAULT 'student' NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "lecturer" ADD CONSTRAINT "lecturer_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student" ADD CONSTRAINT "student_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student" ADD CONSTRAINT "student_study_program_id_study_program_id_fk" FOREIGN KEY ("study_program_id") REFERENCES "public"."study_program"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_program" ADD CONSTRAINT "study_program_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;