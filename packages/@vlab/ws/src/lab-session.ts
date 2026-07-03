import { Type as t } from "@sinclair/typebox";
import { toStandardSchema } from "@vlab/shared/standard-schema";
import Waycast from "waycast";
import type { WSMeta } from "./types";

export const labSessionRouter = new Waycast<WSMeta>()
	.rpc("lab:[id]:init", {
		payload: toStandardSchema(t.Optional(t.Any())),
		replies: {
			info: toStandardSchema(t.String()),
			warn: toStandardSchema(t.String()),
		},
		response: toStandardSchema(t.String()),
		meta: { private: ["student"] },
	})
	.rpc("lab-session:[sessionId]:connect", {
		payload: toStandardSchema(t.Boolean()),
		response: toStandardSchema(t.Boolean()),
		meta: { private: ["student"] },
	})

	.data(
		"lab-session:[sessionId]:client-change",
		toStandardSchema(t.Union([t.String(), t.Null()])),
	)
	.data("lab-session:[sessionId]:ended")
	.data(
		"lab-session:[sessionId]:checks",
		toStandardSchema(
			t.Object({
				id: t.String(),
				completed: t.Boolean(),
			}),
		),
	)
	.data(
		"node:[id]:health",
		toStandardSchema(
			t.Union([
				t.Null(),
				t.Literal("deleted"),
				t.Literal("healthy"),
				t.Literal("unhealthy"),
				t.Literal("starting"),
			]),
		),
	)
	.data(
		"node:[id]:interfaces:[interface]",
		toStandardSchema(t.Array(t.String())),
	);
