CREATE TYPE "public"."device_kind" AS ENUM('nokia_srlinux', 'nokia_sros', 'nokia_srsim', 'arista_ceos', 'arista_veos', 'juniper_crpd', 'juniper_vmx', 'juniper_vqfx', 'juniper_vsrx', 'juniper_vjunosrouter', 'juniper_vjunosswitch', 'juniper_vjunosevolved', 'juniper_cjunosevolved', 'cisco_xrd', 'cisco_xrv', 'cisco_xrv9k', 'cisco_csr1000v', 'cisco_n9kv', 'cisco_c8000', 'cisco_c8000v', 'cisco_cat9kv', 'cisco_iol', 'cisco_ftdv', 'cumulus_cvx', 'aruba_aoscx', 'sonic-vs', 'sonic-vm', 'dell_ftosv', 'dell_sonic', 'mikrotik_ros', 'huawei_vrp', 'ipinfusion_ocnos', 'paloalto_panos', 'fortinet_fortigate', 'checkpoint_cloudguard', '6wind_vsr', 'keysight_ixia-c-one', 'arrcus_arcos', 'fdio_vpp', 'rare', 'vyosnetworks_vyos', 'generic_vm', 'linux', 'freebsd', 'openwrt', 'openbsd', 'k8s-kind', 'bridge', 'ovs-bridge', 'ext-container', 'host');--> statement-breakpoint
CREATE TABLE "device_category" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"icon" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_test_session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"leased_ports" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"name" text NOT NULL,
	"kind" "device_kind" NOT NULL,
	"image" text NOT NULL,
	"icon" text NOT NULL,
	"category_id" uuid NOT NULL,
	"env" jsonb NOT NULL,
	"resources" jsonb NOT NULL,
	"connection" jsonb NOT NULL,
	"interfaces" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "device" ADD CONSTRAINT "device_category_id_device_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."device_category"("id") ON DELETE no action ON UPDATE no action;