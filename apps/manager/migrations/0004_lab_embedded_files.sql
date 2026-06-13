CREATE TABLE "lab_embedded_file" (
	"lab_id" uuid NOT NULL,
	"file" text NOT NULL,
	CONSTRAINT "lab_embedded_file_lab_id_file_pk" PRIMARY KEY("lab_id","file")
);
--> statement-breakpoint
ALTER TABLE "lab_embedded_file" ADD CONSTRAINT "lab_embedded_file_lab_id_lab_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."lab"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lab_embedded_file_file_idx" ON "lab_embedded_file" USING btree ("file");