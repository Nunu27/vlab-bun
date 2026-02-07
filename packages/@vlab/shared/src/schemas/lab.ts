import { t } from "elysia";
import { DateRange, NonEmptyString } from "./common";
import { DeviceTemplateResourcesSchema } from "./device-template";

const BaseNodeSchema = t.Object({
	x: t.Number(),
	y: t.Number(),
});

export const LabDeviceNodeSchema = t.Intersect([
	BaseNodeSchema,
	t.Object({
		name: NonEmptyString(),
		deviceId: t.String({ format: "uuid" }),
		groupIds: t.Array(t.String({ format: "uuid" })),
		resources: DeviceTemplateResourcesSchema,
		edges: t.Record(t.String({ format: "uuid" }), NonEmptyString()),
	}),
]);

export const LabGroupNodeSchema = t.Intersect([
	BaseNodeSchema,
	t.Object({
		name: NonEmptyString(),
		color: t.String(),
		members: t.Array(t.String({ format: "uuid" })),
		width: t.Number(),
		height: t.Number(),
	}),
]);

export const LabNoteNodeSchema = t.Intersect([
	BaseNodeSchema,
	t.Object({ content: NonEmptyString() }),
]);

export const LabEdgeItemSchema = t.Object({
	deviceId: t.String({ format: "uuid" }),
	interface: t.String(),
});

export const LabEdgeSchema = t.Tuple([LabEdgeItemSchema, LabEdgeItemSchema]);

export const LabTopologySchema = t.Object({
	deviceCounts: t.Record(t.String({ format: "uuid" }), t.Number()),

	devices: t.Record(t.String({ format: "uuid" }), LabDeviceNodeSchema),
	groups: t.Record(t.String({ format: "uuid" }), LabGroupNodeSchema),
	notes: t.Record(t.String({ format: "uuid" }), LabNoteNodeSchema),
	edges: t.Record(t.String({ format: "uuid" }), LabEdgeSchema),
});

export const LabCheckConfigSchema = t.Object({
	id: t.String(),
	nodeId: t.String(),
	checkId: t.String(),
	params: t.Record(t.String(), t.Unknown()),
	weight: t.Number(),
});

export type LabCheckConfig = typeof LabCheckConfigSchema.static;

export const LabInstructionSchema = t.Recursive((Self) =>
	t.Object({
		id: t.String(),
		text: t.String(),
		checks: t.Array(LabCheckConfigSchema),
		children: t.Array(Self),
	}),
);

export type LabInstruction = typeof LabInstructionSchema.static;
export type LabInstructionForm = Omit<LabInstruction, "children"> & {
	children: unknown[];
};

export const LabRequest = t.Object({
	name: NonEmptyString(),
	content: NonEmptyString(),
	cover: t.Optional(t.String()),
	isPublished: t.Boolean(),
	date: DateRange,
	maxAttempt: t.Optional(t.Integer({ min: 1 })),
	topology: LabTopologySchema,
	instructions: t.Array(LabInstructionSchema),
	attachments: t.Array(
		t.Object({
			name: NonEmptyString(),
			file: NonEmptyString(),
		}),
	),
});

export type LabDeviceNode = typeof LabDeviceNodeSchema.static;
export type LabGroupNode = typeof LabGroupNodeSchema.static;
export type LabNoteNode = typeof LabNoteNodeSchema.static;
export type LabEdge = typeof LabEdgeSchema.static;
export type LabTopology = typeof LabTopologySchema.static;

export const SessionNodeRequest = t.Object({
	id: t.String({ format: "uuid" }),
	nodeId: t.String({ format: "uuid" }),
});
