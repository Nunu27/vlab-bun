import { Type as t } from "@sinclair/typebox";
import { Router } from "waycast";

export const LabNodeSchema = t.Object({
	labNodeId: t.Optional(t.String()),
	id: t.String(),
	name: t.String(),
	image: t.String(),
	kind: t.String(),
	env: t.Record(t.String(), t.String()),
	resources: t.Object({
		cpu: t.Optional(t.Number()),
		memory: t.Optional(t.String()),
	}),
	deviceId: t.Optional(t.String()),
});

export const LabLinkSchema = t.Object({
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

export const StartEvaluationPayloadSchema = t.Object({
	sessionId: t.String(),
	nodeMap: t.Record(t.String(), t.Unknown()),
	sessionChecks: t.Array(t.Unknown()),
	values: t.Record(t.String(), t.Boolean()),
});

export const appRouter = new Router()
	.data(
		"monitor:stale-session",
		t.Object({
			sessionId: t.String(),
		}),
	)
	.data(
		"monitor:snapshot",
		t.Object({
			sessions: t.Array(t.Object({ id: t.String() })),
			nodes: t.Array(
				t.Object({
					id: t.String(),
					health: t.Union([t.String(), t.Null()]),
					interfaces: t.Record(t.String(), t.Unknown()),
					containerId: t.String(),
				}),
			),
		}),
	)
	.data(
		"monitor:session-create",
		t.Object({
			id: t.String(),
			ownerId: t.String(),
			labId: t.Optional(t.String()),
			labDue: t.Optional(t.Union([t.String(), t.Number()])),
		}),
	)
	.data(
		"monitor:session-remove",
		t.Object({
			sessionId: t.String(),
		}),
	)
	.data(
		"monitor:node-create",
		t.Object({
			labSessionId: t.String(),
			labNodeId: t.Optional(t.String()),
			deviceTemplateId: t.Optional(t.String()),
			id: t.String(),
			name: t.String(),

			health: t.Union([t.String(), t.Null()]),
			containerId: t.String(),
		}),
	)
	.data(
		"monitor:node-health",
		t.Object({
			node: t.Object({
				id: t.String(),
				health: t.Union([t.String(), t.Null()]),
				labSessionId: t.String(),
			}),
			isTemp: t.Boolean(),
		}),
	)
	.data(
		"monitor:interface-update",
		t.Object({
			node: t.Object({
				id: t.String(),
				interfaces: t.Record(t.String(), t.Unknown()),
				labSessionId: t.String(),
			}),
			isTemp: t.Boolean(),
		}),
	)
	.rpc("clab:deployLab", {
		payload: t.Object({
			sessionId: t.String(),
			config: LabConfigSchema,
		}),
		replies: {},
		response: t.Boolean(),
		meta: {},
	})
	.rpc("clab:destroyLab", {
		payload: t.Object({
			sessionId: t.String(),
		}),
		replies: {},
		response: t.Boolean(),
		meta: {},
	})
	.rpc("evaluator:start", {
		payload: StartEvaluationPayloadSchema,
		replies: {
			checkChanged: t.Object({ id: t.String(), completed: t.Boolean() }),
		},
		response: t.Boolean(),
		meta: {},
	})
	.rpc("docker:pullImage", {
		payload: t.Object({
			image: t.String(),
		}),
		replies: {},
		response: t.Boolean(),
		meta: {},
	})
	.rpc("evaluator:stop", {
		payload: t.Object({
			sessionId: t.String(),
			immediate: t.Optional(t.Boolean()),
		}),
		replies: {},
		response: t.Boolean(),
		meta: {},
	});

export type AppRouter = typeof appRouter;
