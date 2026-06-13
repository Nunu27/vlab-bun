CREATE INDEX "lab_attachments_file_idx" ON "lab_attachments" USING btree ("file");--> statement-breakpoint
CREATE INDEX "lab_cover_idx" ON "lab" USING btree ("cover");--> statement-breakpoint
ALTER TABLE "file" DROP COLUMN "used_by";