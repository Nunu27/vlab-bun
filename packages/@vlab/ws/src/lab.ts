import { Type as t } from "@sinclair/typebox";
import { Router } from "waycast";
import type { WSMeta } from "./types";

export const labRouter = new Router<WSMeta>()
	.data("lab:[labId]:enrollment:new", t.Any())
	.data(
		"lab:[labId]:enrollment:update",
		t.Object({
			id: t.String(),
			status: t.String(),
			score: t.Optional(t.String()),
			lastUpdated: t.Date(),
		}),
	)
	.data(
		"lab:[labId]:enrollment:remove",
		t.Object({
			studentId: t.String(),
		}),
	);
