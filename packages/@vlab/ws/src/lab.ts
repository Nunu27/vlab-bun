import { Type as t } from "@sinclair/typebox";
import { toStandardSchema } from "@vlab/shared/standard-schema";
import Waycast from "waycast";
import type { WSMeta } from "./types";

export const labRouter = new Waycast<WSMeta>()
	.data("lab:[labId]:enrollment:new", toStandardSchema(t.Any()))
	.data(
		"lab:[labId]:enrollment:update",
		toStandardSchema(
			t.Object({
				id: t.String(),
				status: t.String(),
				score: t.Optional(t.String()),
				lastUpdated: t.Date(),
			}),
		),
	)
	.data(
		"lab:[labId]:enrollment:remove",
		toStandardSchema(
			t.Object({
				studentId: t.String(),
			}),
		),
	);
