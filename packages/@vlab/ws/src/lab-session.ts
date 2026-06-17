import { Type as t } from "@sinclair/typebox";
import { Router } from "waycast";
import type { WSMeta } from "./types";

export const labSessionRouter = new Router<WSMeta>()
	.rpc("lab:[id]:init", {
		payload: t.Optional(t.Any()),
		replies: {
			info: t.String(),
		},
		response: t.String(),
		meta: { private: ["student"] },
	})
	.rpc("lab-session:[sessionId]:connect", {
		payload: t.Boolean(),
		response: t.Boolean(),
		meta: { private: ["student"] },
	})

	.data(
		"lab-session:[sessionId]:client-change",
		t.Union([t.String(), t.Null()]),
	)
	.data("lab-session:[sessionId]:ended", t.Void())
	.data(
		"lab-session:[sessionId]:checks",
		t.Object({
			id: t.String(),
			completed: t.Boolean(),
		}),
	)
	.data(
		"node:[id]:health",
		t.Union([
			t.Null(),
			t.Literal("deleted"),
			t.Literal("healthy"),
			t.Literal("unhealthy"),
			t.Literal("starting"),
		]),
	)
	.data("node:[id]:interfaces:[interface]", t.Array(t.String()));
