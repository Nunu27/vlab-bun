ALTER TABLE "device" DROP CONSTRAINT "device_category_id_device_category_id_fk";
--> statement-breakpoint
ALTER TABLE "lab_node" DROP CONSTRAINT "lab_node_device_id_device_id_fk";
--> statement-breakpoint
ALTER TABLE "lab_node" DROP CONSTRAINT "lab_node_lab_session_id_lab_session_id_fk";
--> statement-breakpoint
ALTER TABLE "device" ADD CONSTRAINT "device_category_id_device_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."device_category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_node" ADD CONSTRAINT "lab_node_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_node" ADD CONSTRAINT "lab_node_lab_session_id_lab_session_id_fk" FOREIGN KEY ("lab_session_id") REFERENCES "public"."lab_session"("id") ON DELETE cascade ON UPDATE no action;