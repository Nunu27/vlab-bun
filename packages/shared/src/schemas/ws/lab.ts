import { nodeHealthEnum } from "@shared/enums";
import { createRoom, createTopic } from "@shared/types";
import { createWSSchema } from "@shared/types/ws";
import { t } from "elysia/type-system";

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

export const labNodeHealthTopic = createTopic({
	name: "lab-node",
	rooms: createRoom("health/:nodeId"),
	data: t.Nullable(t.UnionEnum([...nodeHealthEnum, "deleted"]))
});
