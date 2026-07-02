import { Type as t } from "@sinclair/typebox";
import { DeviceTemplateResourcesSchema } from "@vlab/shared/schemas/device-template";
import { Router } from "waycast";

const LabNodeSchema = t.Object({
	labNodeId: t.Optional(t.String()),
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
	containerId: t.String(),
	health: t.Union([t.String(), t.Null()]),
});

const EvaluatorNodeInfoSchema = t.Object({
	id: t.String(),
	ip: t.String(),
	containerId: t.String(),
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

export const appRouter = new Router()
	.data(
		"monitor:node-health",
		t.Object({
			node: t.Object({
				id: t.String(),
				health: t.Union([t.String(), t.Null()]),
				labSessionId: t.Optional(t.String()),
			}),
		}),
	)
	.data(
		"monitor:interface-update",
		t.Object({
			node: t.Object({
				id: t.String(),
				interfaces: t.Record(t.String(), t.Array(t.String())),
				labSessionId: t.String(),
			}),
		}),
	)
	.rpc("clab:deployLab", {
		payload: t.Object({
			sessionId: t.String(),
			config: LabConfigSchema,
		}),
		response: t.Array(DeployedNodeSchema),
	})
	.rpc("clab:destroyLab", {
		payload: t.Object({
			sessionId: t.String(),
		}),
	})
	.rpc("clab:reconcileSessions", {
		payload: t.Object({
			activeSessionIds: t.Array(t.String()),
		}),
		response: t.Array(t.String()),
	})
	.rpc("docker:pullImage", {
		payload: t.Object({
			image: t.String(),
		}),
	})
	.rpc("docker:measureContainerStats", {
		payload: t.Object({
			containerId: t.String(),
		}),
		response: t.Object({ cpuCores: t.Number(), memoryMB: t.Number() }),
	})
	.rpc("evaluator:start", {
		payload: StartEvaluationPayloadSchema,
		replies: {
			checkChanged: t.Object({ id: t.String(), completed: t.Boolean() }),
		},
	})
	.rpc("evaluator:stop", {
		payload: t.Object({
			sessionId: t.String(),
			immediate: t.Optional(t.Boolean()),
		}),
	});

export type AppRouter = typeof appRouter;
