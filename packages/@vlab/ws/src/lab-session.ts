import { WSContracts } from "@jawit/ws";
import { Type as t } from "@sinclair/typebox";
import { nodeHealthValues } from "@vlab/shared/enums";
import type { WSMeta } from "./types";

export default new WSContracts<WSMeta>()
	.register({
		event: "lab:[id]:init",
		type: "client2server",
		replies: {
			info: t.String(),
			id: t.String(),
		},
		meta: { private: ["student"] },
	})
	.register({
		event: "lab-session:[sessionId]:connect",
		type: "client2server",
		data: t.Boolean(),
		replies: {
			conflict: t.Boolean(),
		},
		meta: { private: ["student"] },
	})
	.register({
		event: "lab-session:[sessionId]:submit",
		type: "client2server",
		meta: { private: ["student"] },
	})
	.register({
		event: "lab-session:[sessionId]:client-change",
		type: "server2client",
		data: t.Union([t.String(), t.Null()]),
	})
	.register({
		event: "lab-session:[sessionId]:ended",
		type: "server2client",
	})
	.register({
		event: "lab-session:[sessionId]:checks",
		type: "server2client",
		data: t.Object({
			id: t.String(),
			completed: t.Boolean(),
		}),
	})
	.register({
		event: "node:[id]:health",
		type: "server2client",
		data: t.Union([
			t.Null(),
			t.Literal("deleted"),
			...nodeHealthValues.map((v) => t.Literal(v)),
		]),
	})
	.register({
		event: "node:[id]:interfaces:[interface]",
		type: "server2client",
		data: t.Array(t.String()),
	});
