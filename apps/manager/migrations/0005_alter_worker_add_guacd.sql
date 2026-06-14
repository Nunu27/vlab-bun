ALTER TABLE "lab_session" DROP CONSTRAINT "lab_session_lab_id_lab_id_fk";
--> statement-breakpoint
ALTER TABLE "lab_session" DROP CONSTRAINT "lab_session_student_id_student_id_fk";
--> statement-breakpoint
ALTER TABLE "lab_session" DROP CONSTRAINT "lab_session_worker_id_worker_id_fk";
--> statement-breakpoint
ALTER TABLE "worker" ALTER COLUMN "manager_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "worker" ADD COLUMN "guacd_host" text NOT NULL;--> statement-breakpoint
ALTER TABLE "worker" ADD COLUMN "guacd_port" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_session" ADD CONSTRAINT "lab_session_lab_id_lab_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."lab"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_session" ADD CONSTRAINT "lab_session_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_session" ADD CONSTRAINT "lab_session_worker_id_worker_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker"("id") ON DELETE cascade ON UPDATE no action;