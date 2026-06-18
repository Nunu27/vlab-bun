import type { LabTopology } from "@vlab/shared/schemas/lab";
import { jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { base } from "./base";

export const topologyTemplates = pgTable("topology_template", {
	...base,
	name: text().notNull(),
	topology: jsonb().$type<LabTopology>().notNull(),
});
