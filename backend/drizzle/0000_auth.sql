CREATE TYPE "public"."degree_level" AS ENUM('D3', 'LJ', 'D4', 'S2');--> statement-breakpoint
CREATE TYPE "public"."roles" AS ENUM('student', 'lecturer', 'admin');--> statement-breakpoint
CREATE TABLE "department" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lecturer" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone,
	"nip" text NOT NULL,
	CONSTRAINT "lecturer_nip_unique" UNIQUE("nip")
);
--> statement-breakpoint
CREATE TABLE "student" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone,
	"nrp" text NOT NULL,
	"year" integer NOT NULL,
	"studyProgramId" uuid NOT NULL,
	CONSTRAINT "student_nrp_unique" UNIQUE("nrp")
);
--> statement-breakpoint
CREATE TABLE "study_program" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone,
	"name" text NOT NULL,
	"degreeLevel" "degree_level" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"passwordHash" text NOT NULL,
	"role" "roles" DEFAULT 'student' NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "lecturer" ADD CONSTRAINT "lecturer_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student" ADD CONSTRAINT "student_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student" ADD CONSTRAINT "student_studyProgramId_study_program_id_fk" FOREIGN KEY ("studyProgramId") REFERENCES "public"."study_program"("id") ON DELETE no action ON UPDATE no action;