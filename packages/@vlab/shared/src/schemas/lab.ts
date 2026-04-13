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
	nodeId: t.String({ format: "uuid" }),
	checkId: t.String(),
	params: t.Record(t.String(), t.Unknown()),
	weight: t.Number(),
});

export const LabChecksMapSchema = t.Record(
	t.String({ format: "uuid" }),
	LabCheckConfigSchema,
);

export type LabCheckConfig = typeof LabCheckConfigSchema.static;
export type LabChecksMap = typeof LabChecksMapSchema.static;

export const LabRequestSchema = t.Object({
	name: NonEmptyString(),
	content: NonEmptyString(),
	cover: t.Optional(t.String()),
	isPublished: t.Boolean(),
	date: DateRange,
	sessionDuration: t.Integer({ min: 1, default: 180 }),
	maxAttempt: t.Optional(t.Integer({ min: 1 })),
	topology: LabTopologySchema,
	instructions: NonEmptyString(),
	checks: LabChecksMapSchema,
	attachments: t.Array(
		t.Object({
			name: NonEmptyString(),
			file: NonEmptyString(),
		}),
	),
});

export type LabRequest = typeof LabRequestSchema.static;
export type LabDeviceNode = typeof LabDeviceNodeSchema.static;
export type LabGroupNode = typeof LabGroupNodeSchema.static;
export type LabNoteNode = typeof LabNoteNodeSchema.static;
export type LabEdge = typeof LabEdgeSchema.static;
export type LabTopology = typeof LabTopologySchema.static;

export const SessionNodeRequest = t.Object({
	id: t.String({ format: "uuid" }),
	nodeId: t.String({ format: "uuid" }),
});
