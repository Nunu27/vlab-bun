ALTER TABLE "file_dependency" DROP CONSTRAINT "file_dependency_file_file_name_fk";
--> statement-breakpoint
ALTER TABLE "file_dependency" ADD CONSTRAINT "file_dependency_file_file_name_fk" FOREIGN KEY ("file") REFERENCES "public"."file"("name") ON DELETE cascade ON UPDATE no action;