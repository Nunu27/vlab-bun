import { WSContracts } from "@jawit/ws";
import { Type as t } from "@sinclair/typebox";
import { nodeHealthValues } from "@vlab/shared/enums";
import type { WSMeta } from "./types";

export default new WSContracts<WSMeta>()
	.register({
		event: "lab:[id]:init",
		type: "client2server",
	})
	.register({
		event: "lab-session:[sessionId]:checks:[checkId]",
		type: "server2client",
		data: t.Boolean(),
	})
	.register({
		event: "node:[id]:health",
		type: "server2client",
		data: t.Union([t.Null(), ...nodeHealthValues.map((v) => t.Literal(v))]),
	})
	.register({
		event: "node:[id]:interfaces",
		type: "server2client",
		data: t.Record(t.String(), t.Array(t.String())),
	});
