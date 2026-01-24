import { t } from "elysia";
import { NonEmptyString } from "../common";
import { DeviceResourcesSchema } from "./device";

export const LabDeviceNodeSchema = t.Object({
	id: t.String(),
	type: t.Literal("device"),
	name: t.String(),
	x: t.Number(),
	y: t.Number(),
	deviceId: t.String(),
	groupIds: t.Optional(t.Array(t.String())),
	resources: t.Optional(DeviceResourcesSchema),
	interfaces: t.Array(t.Boolean())
});

export const LabGroupNodeSchema = t.Object({
	id: t.String(),
	type: t.Literal("group"),
	name: t.String(),
	x: t.Number(),
	y: t.Number(),
	width: t.Number(),
	height: t.Number(),
	color: t.String()
});

export const LabNoteNodeSchema = t.Object({
	id: t.String(),
	type: t.Literal("note"),
	content: t.String(),
	x: t.Number(),
	y: t.Number(),
	width: t.Number(),
	height: t.Number()
});

export const LabNodeSchema = t.Union([
	LabDeviceNodeSchema,
	LabGroupNodeSchema,
	LabNoteNodeSchema
]);

export const LabEdgeSchema = t.Object({
	id: t.String(),
	source: t.String(),
	target: t.String(),
	sourceHandle: t.String(),
	targetHandle: t.String()
});

export const LabTopologySchema = t.Object({
	nodes: t.Array(LabNodeSchema),
	edges: t.Array(LabEdgeSchema)
});

export const LabRequest = t.Object({
	name: NonEmptyString(),
	topology: LabTopologySchema
});

export type LabDeviceNode = typeof LabDeviceNodeSchema.static;
export type LabGroupNode = typeof LabGroupNodeSchema.static;
export type LabNoteNode = typeof LabNoteNodeSchema.static;
export type LabNode = typeof LabNodeSchema.static;
export type LabEdge = typeof LabEdgeSchema.static;
export type LabTopology = typeof LabTopologySchema.static;

export const SessionNodeRequest = t.Object({
	id: t.String({ format: "uuid" }),
	nodeId: t.String({ format: "uuid" })
});
