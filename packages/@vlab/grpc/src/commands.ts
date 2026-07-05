import { Type as t } from "@sinclair/typebox";
import { nodeHealthValues } from "@vlab/shared/enums";
import { DeviceTemplateResourcesSchema } from "@vlab/shared/schemas/device-template";
import { toStandardSchema } from "@vlab/shared/standard-schema";
import Waycast from "waycast";

// Mirrors @vlab/shared's NodeHealth
const NodeHealthSchema = t.Union([
	...nodeHealthValues.map((value) => t.Literal(value)),
	t.Null(),
]);

const LabNodeSchema = t.Object({
	id: t.String(),
	name: t.String(),
	image: t.String(),
	kind: t.String(),
	env: t.Record(t.String(), t.String()),
	resources: DeviceTemplateResourcesSchema,
	credentials: t.Optional(
		t.Object({
			username: t.Optional(t.String()),
			password: t.Optional(t.String()),
		}),
	),
	deviceId: t.Optional(t.String()),
});

const LabLinkSchema = t.Object({
	sourceId: t.String(),
	sourceInterface: t.String(),
	targetId: t.String(),
	targetInterface: t.String(),
});

export const LabConfigSchema = t.Object({
	dueDate: t.Optional(t.Number()),
	labId: t.Optional(t.String()),
	ownerId: t.String(),
	nodes: t.Array(LabNodeSchema),
	links: t.Optional(t.Array(LabLinkSchema)),
});

const DeployedNodeSchema = t.Object({
	id: t.String(),
	ip: t.String(),
	health: NodeHealthSchema,
	nodeId: t.String(),
});

const EvaluatorNodeInfoSchema = t.Object({
	id: t.String(),
	ip: t.String(),
	credentials: t.Optional(
		t.Object({
			username: t.Optional(t.String()),
			password: t.Optional(t.String()),
		}),
	),
});

const EvaluatorSessionCheckSchema = t.Object({
	id: t.String(),
	nodeId: t.String(),
	checkId: t.String(),
	params: t.Record(t.String(), t.Unknown()),
});

const StartEvaluationPayloadSchema = t.Object({
	sessionId: t.String(),
	nodeMap: t.Record(t.String(), EvaluatorNodeInfoSchema),
	sessionChecks: t.Array(EvaluatorSessionCheckSchema),
	values: t.Record(t.String(), t.Boolean()),
});

export const appRouter = new Waycast()
	.data(
		"monitor:node-health",
		toStandardSchema(
			t.Object({
				id: t.String(),
				health: NodeHealthSchema,
				lab: t.String(),
			}),
		),
	)
	.data(
		"monitor:interface-update",
		toStandardSchema(
			t.Object({
				id: t.String(),
				interfaces: t.Record(t.String(), t.Array(t.String())),
				lab: t.String(),
			}),
		),
	)
	.data(
		"evaluator:checkChanged",
		toStandardSchema(
			t.Object({
				sessionId: t.String(),
				id: t.String(),
				completed: t.Boolean(),
			}),
		),
	)
	.rpc("clab:deployLab", {
		payload: toStandardSchema(
			t.Object({
				sessionId: t.String(),
				config: LabConfigSchema,
			}),
		),
		response: toStandardSchema(t.Array(DeployedNodeSchema)),
	})
	.rpc("clab:destroyLab", {
		payload: toStandardSchema(
			t.Object({
				sessionId: t.String(),
			}),
		),
	})
	.rpc("clab:reconcileSessions", {
		payload: toStandardSchema(
			t.Object({
				activeSessionIds: t.Array(t.String()),
			}),
		),
		response: toStandardSchema(t.Array(t.String())),
	})
	.rpc("docker:pullImage", {
		payload: toStandardSchema(
			t.Object({
				image: t.String(),
			}),
		),
	})
	.rpc("docker:measureContainerStats", {
		payload: toStandardSchema(
			t.Object({
				id: t.String(),
			}),
		),
		response: toStandardSchema(
			t.Object({ cpuCores: t.Number(), memoryMB: t.Number() }),
		),
	})
	.rpc("evaluator:start", {
		payload: toStandardSchema(StartEvaluationPayloadSchema),
	})
	.rpc("evaluator:stop", {
		payload: toStandardSchema(
			t.Object({
				sessionId: t.String(),
				immediate: t.Optional(t.Boolean()),
			}),
		),
	});

export type AppRouter = typeof appRouter;
