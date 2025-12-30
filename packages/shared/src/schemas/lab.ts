import { t } from "elysia";
import { createWSSchema } from "../types/ws";

export const LabNodeResourcesSchema = t.Object({
	cpu: t.Optional(t.Number()),
	memory: t.Optional(t.String())
});

export const LabDeviceNodeSchema = t.Object({
	id: t.String(),
	type: t.Literal("device"),
	label: t.String(),
	x: t.Number(),
	y: t.Number(),
	width: t.Number(),
	height: t.Number(),
	deviceId: t.String(),
	groupIds: t.Optional(t.Array(t.String())),
	resources: t.Optional(LabNodeResourcesSchema),
	interfaces: t.Array(t.Boolean()),
	token: t.Optional(t.String())
});

export const LabGroupNodeSchema = t.Object({
	id: t.String(),
	type: t.Literal("group"),
	label: t.String(),
	x: t.Number(),
	y: t.Number(),
	width: t.Number(),
	height: t.Number(),
	color: t.String()
});

export const LabNoteNodeSchema = t.Object({
	id: t.String(),
	type: t.Literal("note"),
	label: t.String(),
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

export const CreateLabRequest = t.Object({
	name: t.String({ minLength: 1 }),
	topology: LabTopologySchema
});

export const UpdateLabRequest = t.Partial(CreateLabRequest);

export type LabDeviceNode = (typeof LabDeviceNodeSchema)["static"];
export type LabGroupNode = (typeof LabGroupNodeSchema)["static"];
export type LabNoteNode = (typeof LabNoteNodeSchema)["static"];
export type LabNode = (typeof LabNodeSchema)["static"];
export type LabEdge = (typeof LabEdgeSchema)["static"];
export type LabTopology = (typeof LabTopologySchema)["static"];
export type LabNodeResources = (typeof LabNodeResourcesSchema)["static"];

export const StartLabSessionRequest = t.Object({
	labId: t.String({ format: "uuid" })
});

export const StopLabSessionRequest = t.Object({
	sessionId: t.String({ format: "uuid" })
});

export const labWSSchemas = [
	createWSSchema({
		type: "client2server",
		name: "lab/start",
		private: ["student", "lecturer", "admin"],
		reply: {
			message: t.String(),
			error: t.String(),
			sessionId: t.String()
		},
		data: StartLabSessionRequest
	}),
	createWSSchema({
		type: "client2server",
		name: "lab/stop",
		private: ["student", "lecturer", "admin"],
		reply: {
			message: t.String(),
			error: t.String(),
			done: t.Boolean()
		},
		data: StopLabSessionRequest
	})
] as const;
