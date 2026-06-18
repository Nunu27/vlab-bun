import { type StaticDecode, Type as t } from "@sinclair/typebox";
import { NonEmptyString } from "./common";
import { LabTopologySchema } from "./lab";

export const TopologyTemplateSchema = t.Object({
	id: t.String({ format: "uuid" }),
	name: NonEmptyString(),
	topology: LabTopologySchema,
	createdAt: t.String({ format: "date-time" }),
	updatedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
});

export const TopologyTemplateRequestSchema = t.Object({
	name: NonEmptyString(),
	topology: LabTopologySchema,
});

export type TopologyTemplate = StaticDecode<typeof TopologyTemplateSchema>;
export type TopologyTemplateRequest = StaticDecode<
	typeof TopologyTemplateRequestSchema
>;
