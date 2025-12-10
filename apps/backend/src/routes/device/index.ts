import db from "@backend/db";
import { addDBListener } from "@backend/db/listener";
import { labSessions } from "@backend/db/schema";
import { eq } from "drizzle-orm";
import { Elysia } from "elysia";
import cluster from "node:cluster";

import create from "./create";
import cron from "./cron";
import _delete from "./delete";
import detail from "./detail";
import list from "./list";
import pagination from "./pagination";
import update from "./update";

const deviceRouter = new Elysia({
	detail: { tags: ["Device"] }
})
	.use(cron)
	.use(create)
	.use(detail)
	.use(update)
	.use(_delete)
	.use(pagination)
	.use(list);

if (cluster.isPrimary) {
	addDBListener(
		"labSessions",
		["type"],
		async ({ op, data }) => {
			if (
				!data.some(
					(d) =>
						d.current?.type === "device-test" ||
						d.previous?.type === "device-test"
				)
			) {
				return;
			}

			const cron = deviceRouter.store.cron["device-test-session-cleanup"];

			if (op === "INSERT" && !cron.isRunning()) {
				cron.resume();
			} else if (op === "DELETE" && cron.isRunning()) {
				if (await db.$count(labSessions, eq(labSessions.type, "device-test"))) {
					return;
				}

				cron.pause();
			}
		},
		{ ops: ["INSERT", "DELETE"], bulk: true }
	);
}

export default deviceRouter;
